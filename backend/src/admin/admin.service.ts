import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';

export interface DailyRow {
  date: string;
  count: number;
}

export type AdminStats = {
  totalFiles: number;
  activeFiles: number;
  expiredFiles: number;
  totalUsers: number;
  totalAdmins: number;
  totalAnonymousUploads: number;
  totalStorageBytes: number;
  totalDownloads: number;
  avgFileSizeBytes: number;
  uploadsToday: number;
  uploadsYesterday: number;
  downloadsToday: number;
  downloadsYesterday: number;
  uploadsPerDay: DailyRow[];
  downloadsPerDay: DailyRow[];
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async stats() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalFiles,
      activeFiles,
      expiredFiles,
      totalUsers,
      totalAdmins,
      totalAnonymousUploads,
      storageAgg,
      downloadsAgg,
      avgRecent,
      uploadsToday,
      uploadsYesterday,
      downloadsToday,
      downloadsYesterday,
      uploadsRaw,
      downloadsRaw,
    ] = await Promise.all([
      this.prisma.upload.count({ where: { deletedAt: null } }),
      this.prisma.upload.count({
        where: { deletedAt: null, expiresAt: { gt: now } },
      }),
      this.prisma.upload.count({
        where: { deletedAt: null, expiresAt: { lte: now } },
      }),
      this.prisma.user.count({ where: { role: 'USER' } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.upload.count({
        where: { deletedAt: null, userId: null },
      }),
      this.prisma.upload.aggregate({
        where: { deletedAt: null },
        _sum: { fileSize: true },
      }),
      this.prisma.upload.aggregate({
        where: { deletedAt: null },
        _sum: { downloadCount: true },
      }),
      this.prisma.upload.aggregate({
        where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } },
        _avg: { fileSize: true },
      }),
      this.prisma.upload.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      this.prisma.upload.count({
        where: {
          createdAt: { gte: startOfYesterday, lt: startOfToday },
        },
      }),
      this.prisma.downloadLog.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      this.prisma.downloadLog.count({
        where: { createdAt: { gte: startOfYesterday, lt: startOfToday } },
      }),
      this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date,
               COUNT(*)::bigint AS count
        FROM "Upload"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY date
        ORDER BY date ASC
      `,
      this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date,
               COUNT(*)::bigint AS count
        FROM "DownloadLog"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY date
        ORDER BY date ASC
      `,
    ]);

    return {
      totalFiles,
      activeFiles,
      expiredFiles,
      totalUsers,
      totalAdmins,
      totalAnonymousUploads,
      totalStorageBytes: storageAgg._sum.fileSize ?? 0,
      totalDownloads: downloadsAgg._sum.downloadCount ?? 0,
      avgFileSizeBytes: Math.round(avgRecent._avg.fileSize ?? 0),
      uploadsToday,
      uploadsYesterday,
      downloadsToday,
      downloadsYesterday,
      uploadsPerDay: this.fillDays(uploadsRaw, thirtyDaysAgo, 30),
      downloadsPerDay: this.fillDays(downloadsRaw, thirtyDaysAgo, 30),
    };
  }

  async health() {
    const now = new Date();
    const [cleanupQueueSize, storageAgg] = await Promise.all([
      this.prisma.upload.count({
        where: { deletedAt: null, expiresAt: { lte: now } },
      }),
      this.prisma.upload.aggregate({
        where: { deletedAt: null },
        _sum: { fileSize: true },
      }),
    ]);
    const totalGb = Number(
      this.config.get('STORAGE_TOTAL_BYTES') ??
        100 * 1024 * 1024 * 1024,
    );
    return {
      status: 'ok',
      uptimeSeconds: Math.floor(process.uptime()),
      cleanupQueueSize,
      storageUsedBytes: storageAgg._sum.fileSize ?? 0,
      storageTotalBytes: totalGb,
    };
  }

  async listUploads(q: {
    page?: number;
    limit?: number;
    sort?: 'newest' | 'oldest' | 'largest' | 'most_downloaded';
    status?: 'all' | 'active' | 'expired';
    search?: string;
    userId?: string;
    anonymous?: boolean;
  }) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(q.limit ?? 20)));
    const now = new Date();

    const where: Record<string, unknown> = { deletedAt: null };
    if (q.search) {
      where.fileName = { contains: q.search, mode: 'insensitive' };
    }
    if (q.userId) where.userId = q.userId;
    if (q.anonymous === true) where.userId = null;
    if (q.status === 'active') where.expiresAt = { gt: now };
    if (q.status === 'expired') where.expiresAt = { lte: now };

    const orderBy =
      q.sort === 'oldest'
        ? { createdAt: 'asc' as const }
        : q.sort === 'largest'
          ? { fileSize: 'desc' as const }
          : q.sort === 'most_downloaded'
            ? { downloadCount: 'desc' as const }
            : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.upload.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { email: true } } },
      }),
      this.prisma.upload.count({ where }),
    ]);

    return {
      items: items.map((u) => ({
        id: u.id,
        slug: u.slug,
        fileName: u.fileName,
        fileSize: u.fileSize,
        mimeType: u.mimeType,
        downloadCount: u.downloadCount,
        downloadLimit: u.downloadLimit,
        expiresAt: u.expiresAt,
        isExpired: u.expiresAt.getTime() <= Date.now(),
        hasPassword: !!u.passwordHash,
        uploaderEmail: u.user?.email ?? null,
        isAnonymous: !u.userId,
        createdAt: u.createdAt,
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async removeUpload(id: string) {
    const upload = await this.prisma.upload.findUnique({ where: { id } });
    if (!upload) return { success: true };
    await this.prisma.upload.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  async listUsers(q: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(q.limit ?? 20)));
    const where: Record<string, unknown> = {};
    if (q.search) {
      where.email = { contains: q.search, mode: 'insensitive' };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const ids = users.map((u) => u.id);
    const aggregates =
      ids.length === 0
        ? []
        : await this.prisma.upload.groupBy({
            by: ['userId'],
            where: { userId: { in: ids }, deletedAt: null },
            _count: { _all: true },
            _sum: { fileSize: true, downloadCount: true },
          });
    const aggMap = new Map(
      aggregates.map((a) => [
        a.userId!,
        {
          uploadCount: a._count._all,
          storageUsedBytes: a._sum.fileSize ?? 0,
          totalDownloads: a._sum.downloadCount ?? 0,
        },
      ]),
    );

    return {
      items: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        createdAt: u.createdAt,
        ...(aggMap.get(u.id) ?? {
          uploadCount: 0,
          storageUsedBytes: 0,
          totalDownloads: 0,
        }),
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async exportCsv(type: 'uploads' | 'users'): Promise<string> {
    if (type === 'users') {
      const users = await this.prisma.user.findMany({
        orderBy: { createdAt: 'asc' },
      });
      const header = 'id,email,firstName,lastName,role,createdAt\n';
      const rows = users
        .map((u) =>
          [
            u.id,
            this.csvEscape(u.email),
            this.csvEscape(u.firstName ?? ''),
            this.csvEscape(u.lastName ?? ''),
            u.role,
            u.createdAt.toISOString(),
          ].join(','),
        )
        .join('\n');
      return header + rows + (rows ? '\n' : '');
    }
    const uploads = await this.prisma.upload.findMany({
      orderBy: { createdAt: 'asc' },
    });
    const header =
      'id,slug,fileName,fileSize,mimeType,userId,anonToken,downloadCount,downloadLimit,expiresAt,createdAt,deletedAt\n';
    const rows = uploads
      .map((u) =>
        [
          u.id,
          u.slug,
          this.csvEscape(u.fileName),
          u.fileSize,
          this.csvEscape(u.mimeType ?? ''),
          u.userId ?? '',
          this.csvEscape(u.anonToken ?? ''),
          u.downloadCount,
          u.downloadLimit ?? '',
          u.expiresAt.toISOString(),
          u.createdAt.toISOString(),
          u.deletedAt ? u.deletedAt.toISOString() : '',
        ].join(','),
      )
      .join('\n');
    return header + rows + (rows ? '\n' : '');
  }

  private csvEscape(value: string): string {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private fillDays(
    rows: { date: string; count: bigint }[],
    since: Date,
    days: number,
  ): DailyRow[] {
    const map = new Map<string, number>(
      rows.map((r) => [r.date, Number(r.count)]),
    );
    const result: DailyRow[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 86_400_000);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, count: map.get(key) ?? 0 });
    }
    return result;
  }
}
