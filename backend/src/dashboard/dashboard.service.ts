import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  EXPIRES_IN_MS,
  type ExpiresIn,
} from '../uploads/dto/create-upload.dto';

type SortKey = 'newest' | 'oldest' | 'largest' | 'most_downloaded';
type StatusFilter = 'all' | 'active' | 'expired';
type Period = '7d' | '30d' | '90d';

interface ListQuery {
  page?: number;
  limit?: number;
  sort?: SortKey;
  status?: StatusFilter;
  search?: string;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  private toListItem(u: {
    id: string;
    slug: string;
    fileName: string;
    fileSize: number;
    mimeType: string | null;
    downloadCount: number;
    downloadLimit: number | null;
    expiresAt: Date;
    passwordHash: string | null;
    createdAt: Date;
  }) {
    const isExpired =
      u.expiresAt.getTime() <= Date.now() ||
      (u.downloadLimit !== null && u.downloadCount >= u.downloadLimit);
    return {
      id: u.id,
      slug: u.slug,
      fileName: u.fileName,
      fileSize: u.fileSize,
      mimeType: u.mimeType,
      downloadCount: u.downloadCount,
      downloadLimit: u.downloadLimit,
      expiresAt: u.expiresAt,
      isExpired,
      hasPassword: !!u.passwordHash,
      createdAt: u.createdAt,
    };
  }

  async list(userId: string, q: ListQuery) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(q.limit ?? 20)));
    const sort: SortKey = q.sort ?? 'newest';
    const status: StatusFilter = q.status ?? 'all';

    const now = new Date();
    const baseWhere: Record<string, unknown> = {
      userId,
      deletedAt: null,
    };
    if (q.search) {
      baseWhere.fileName = { contains: q.search, mode: 'insensitive' };
    }

    let where = baseWhere;
    if (status === 'active') {
      where = {
        ...baseWhere,
        expiresAt: { gt: now },
        OR: [
          { downloadLimit: null },
          { downloadCount: { lt: this.prisma.upload.fields.downloadLimit } },
        ],
      };
    } else if (status === 'expired') {
      where = {
        ...baseWhere,
        OR: [
          { expiresAt: { lte: now } },
          {
            AND: [
              { downloadLimit: { not: null } },
              {
                downloadCount: {
                  gte: this.prisma.upload.fields.downloadLimit,
                },
              },
            ],
          },
        ],
      };
    }

    const orderBy =
      sort === 'oldest'
        ? { createdAt: 'asc' as const }
        : sort === 'largest'
          ? { fileSize: 'desc' as const }
          : sort === 'most_downloaded'
            ? { downloadCount: 'desc' as const }
            : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.upload.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.upload.count({ where }),
    ]);

    return {
      items: items.map((u) => this.toListItem(u)),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async detail(userId: string, id: string) {
    const upload = await this.prisma.upload.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        downloads: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });
    if (!upload) {
      throw new NotFoundException('Upload not found');
    }
    const base = this.toListItem(upload);
    return {
      ...base,
      checksum: upload.checksum,
      downloads: upload.downloads.map((d) => ({
        id: d.id,
        ip: d.ip,
        userAgent: d.userAgent,
        createdAt: d.createdAt,
      })),
    };
  }

  async update(
    userId: string,
    id: string,
    body: {
      fileName?: string;
      expiresIn?: ExpiresIn;
      downloadLimit?: number | null;
      password?: string;
      removePassword?: boolean;
    },
  ) {
    const upload = await this.prisma.upload.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!upload) throw new NotFoundException('Upload not found');

    if (upload.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException('Upload is expired');
    }

    if (body.password && body.removePassword) {
      throw new BadRequestException(
        'password and removePassword are mutually exclusive',
      );
    }
    if (
      body.downloadLimit !== undefined &&
      body.downloadLimit !== null &&
      body.downloadLimit < upload.downloadCount
    ) {
      throw new BadRequestException(
        'downloadLimit cannot be less than current downloadCount',
      );
    }

    const data: Record<string, unknown> = {};
    if (body.fileName) data.fileName = body.fileName.slice(0, 255);
    if (body.expiresIn) {
      data.expiresAt = new Date(Date.now() + EXPIRES_IN_MS[body.expiresIn]);
    }
    if (body.downloadLimit !== undefined) {
      data.downloadLimit = body.downloadLimit;
    }
    if (body.removePassword) {
      data.passwordHash = null;
    } else if (body.password) {
      if (body.password.length < 4 || body.password.length > 72) {
        throw new BadRequestException('password must be 4-72 chars');
      }
      data.passwordHash = await bcrypt.hash(body.password, 12);
    }

    const updated = await this.prisma.upload.update({ where: { id }, data });
    return this.toListItem(updated);
  }

  async remove(userId: string, id: string) {
    const upload = await this.prisma.upload.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!upload) throw new NotFoundException('Upload not found');

    try {
      await this.storage.delete(upload.storageKey);
    } catch {
      // tolerate storage delete failure — cron will retry
    }
    await this.prisma.upload.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  async stats(userId: string, period: Period) {
    const now = new Date();
    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    // Anchor the window to UTC midnight so today's bucket is always included
    // and the keys align with the UTC-bucketed SQL below (TZ-independent).
    const startOfTodayUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const since = new Date(
      startOfTodayUtc.getTime() - (days - 1) * 24 * 60 * 60 * 1000,
    );

    const [uploads, active, expired, downloadsAgg, storageAgg, downloadsPerDayRaw] =
      await Promise.all([
        this.prisma.upload.count({ where: { userId, deletedAt: null } }),
        this.prisma.upload.count({
          where: {
            userId,
            deletedAt: null,
            expiresAt: { gt: now },
          },
        }),
        this.prisma.upload.count({
          where: {
            userId,
            deletedAt: null,
            OR: [
              { expiresAt: { lte: now } },
              {
                AND: [
                  { downloadLimit: { not: null } },
                  {
                    downloadCount: {
                      gte: this.prisma.upload.fields.downloadLimit,
                    },
                  },
                ],
              },
            ],
          },
        }),
        this.prisma.upload.aggregate({
          where: { userId, deletedAt: null },
          _sum: { downloadCount: true },
        }),
        this.prisma.upload.aggregate({
          where: { userId, deletedAt: null, storagePurgedAt: null },
          _sum: { fileSize: true },
        }),
        this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
          SELECT to_char(date_trunc('day', d."createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
                 COUNT(*)::bigint AS count
          FROM "DownloadLog" d
          JOIN "Upload" u ON u.id = d."uploadId"
          WHERE u."userId" = ${userId}
            AND d."createdAt" >= ${since}
          GROUP BY date
          ORDER BY date ASC
        `,
      ]);

    const downloadsPerDay = this.fillDays(downloadsPerDayRaw, since, days);

    const quotaGb = Number(this.config.get('USER_STORAGE_QUOTA_GB') ?? 10);

    return {
      totalUploads: uploads,
      activeUploads: active,
      expiredUploads: expired,
      totalDownloads: downloadsAgg._sum.downloadCount ?? 0,
      storageUsedBytes: storageAgg._sum.fileSize ?? 0,
      storageQuotaBytes: quotaGb * 1024 * 1024 * 1024,
      downloadsPerDay,
    };
  }

  private fillDays(
    rows: { date: string; count: bigint }[],
    since: Date,
    days: number,
  ) {
    const map = new Map<string, number>(
      rows.map((r) => [r.date, Number(r.count)]),
    );
    const start = Date.UTC(
      since.getUTCFullYear(),
      since.getUTCMonth(),
      since.getUTCDate(),
    );
    const result: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const key = new Date(start + i * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      result.push({ date: key, count: map.get(key) ?? 0 });
    }
    return result;
  }
}
