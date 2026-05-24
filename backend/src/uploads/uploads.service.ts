import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID, createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { PublicUser } from '../auth/auth.types';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';
import { SlugService } from './slug.service';
import {
  ANON_ALLOWED_EXPIRES,
  EXPIRES_IN_MS,
  type ExpiresIn,
} from './dto/create-upload.dto';

const MB = 1024 * 1024;

export interface UploadedFileInput {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class UploadsService {
  private readonly maxAnonBytes: number;
  private readonly maxUserBytes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly slugs: SlugService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    const anonMb = Number(config.get('MAX_FILE_SIZE_ANON_MB') ?? 50);
    const userMb = Number(config.get('MAX_FILE_SIZE_USER_MB') ?? 500);
    this.maxAnonBytes = anonMb * MB;
    this.maxUserBytes = userMb * MB;
  }

  sanitizeFileName(name: string): string {
    const stripped = name
      .replace(/[\r\n\t\0]/g, '')
      .replace(/[<>]/g, '')
      .split(/[\\/]/)
      .pop() ?? 'file';
    return stripped.slice(0, 255) || 'file';
  }

  resolveAnonToken(existing: string | undefined | null): string {
    if (typeof existing === 'string' && existing.length > 0) {
      return existing;
    }
    return randomUUID();
  }

  async create(
    user: PublicUser | undefined,
    anonToken: string,
    file: UploadedFileInput,
    dto: { expiresIn: ExpiresIn; downloadLimit?: number | null; password?: string },
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const isAuthed = !!user;
    const maxBytes = isAuthed ? this.maxUserBytes : this.maxAnonBytes;
    if (file.size > maxBytes) {
      throw new HttpException(
        `File exceeds maximum size of ${Math.floor(maxBytes / MB)} MB`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    if (!isAuthed && !ANON_ALLOWED_EXPIRES.includes(dto.expiresIn)) {
      throw new BadRequestException(
        'Anonymous uploads support max 7d expiration',
      );
    }

    let downloadLimit: number | null;
    if (dto.downloadLimit === undefined || dto.downloadLimit === null) {
      if (!isAuthed) {
        throw new BadRequestException(
          'Anonymous uploads must specify a download limit (1-100)',
        );
      }
      downloadLimit = null;
    } else {
      const limit = Number(dto.downloadLimit);
      if (!Number.isInteger(limit) || limit < 1) {
        throw new BadRequestException('downloadLimit must be a positive integer');
      }
      const max = isAuthed ? 1000 : 100;
      if (limit > max) {
        throw new BadRequestException(`downloadLimit must be at most ${max}`);
      }
      downloadLimit = limit;
    }

    let passwordHash: string | null = null;
    if (dto.password) {
      if (!isAuthed) {
        // anonymous password ignored per spec
      } else {
        if (dto.password.length < 4 || dto.password.length > 72) {
          throw new BadRequestException('password must be 4-72 chars');
        }
        passwordHash = await bcrypt.hash(dto.password, 12);
      }
    }

    // Active upload count
    const activeWhere = isAuthed
      ? { userId: user!.id, deletedAt: null, expiresAt: { gt: new Date() } }
      : {
          anonToken,
          userId: null,
          deletedAt: null,
          expiresAt: { gt: new Date() },
        };
    const activeCount = await this.prisma.upload.count({ where: activeWhere });
    const activeLimit = isAuthed ? 100 : 10;
    if (activeCount >= activeLimit) {
      throw new HttpException(
        `Active upload limit reached (${activeLimit})`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const slug = await this.slugs.generate();
    const id = randomUUID();
    const fileName = this.sanitizeFileName(file.originalname);
    const storageKey = `uploads/${id}/${fileName}`;
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    await this.storage.upload(storageKey, file.buffer, file.mimetype);

    const expiresAt = new Date(Date.now() + EXPIRES_IN_MS[dto.expiresIn]);

    const upload = await this.prisma.upload.create({
      data: {
        id,
        slug,
        fileName,
        mimeType: file.mimetype || null,
        fileSize: file.size,
        storageKey,
        checksum,
        passwordHash,
        downloadLimit,
        expiresAt,
        userId: user?.id ?? null,
        anonToken: isAuthed ? null : anonToken,
      },
    });

    return {
      id: upload.id,
      slug: upload.slug,
      fileName: upload.fileName,
      fileSize: upload.fileSize,
      mimeType: upload.mimeType,
      shareUrl: `/s/${upload.slug}`,
      expiresAt: upload.expiresAt,
      downloadLimit: upload.downloadLimit,
      hasPassword: !!upload.passwordHash,
      createdAt: upload.createdAt,
    };
  }

  async getPublicMetadata(slug: string) {
    const upload = await this.prisma.upload.findUnique({ where: { slug } });
    if (!upload || upload.deletedAt) {
      throw new NotFoundException('Upload not found');
    }
    const expired = upload.expiresAt.getTime() <= Date.now();
    const limitReached =
      upload.downloadLimit !== null &&
      upload.downloadCount >= upload.downloadLimit;
    const isAvailable = !expired && !limitReached;

    const body = {
      slug: upload.slug,
      fileName: upload.fileName,
      fileSize: upload.fileSize,
      mimeType: upload.mimeType,
      hasPassword: !!upload.passwordHash,
      downloadCount: upload.downloadCount,
      downloadLimit: upload.downloadLimit,
      expiresAt: upload.expiresAt,
      isAvailable,
      createdAt: upload.createdAt,
    };

    if (!isAvailable) {
      throw new HttpException(body, HttpStatus.GONE);
    }
    return body;
  }

  async verifyPassword(slug: string, password: string) {
    const upload = await this.prisma.upload.findUnique({ where: { slug } });
    if (!upload || upload.deletedAt) {
      throw new NotFoundException('Upload not found');
    }
    if (!upload.passwordHash) {
      return { valid: false };
    }
    const ok = await bcrypt.compare(password, upload.passwordHash);
    if (!ok) {
      throw new ForbiddenException({ valid: false });
    }
    const downloadToken = await this.jwt.signAsync(
      { slug, purpose: 'download' },
      {
        secret: this.config.get<string>('DOWNLOAD_TOKEN_SECRET'),
        expiresIn: '30m',
      },
    );
    return { valid: true, downloadToken };
  }

  async verifyDownloadToken(slug: string, token: string): Promise<boolean> {
    try {
      const payload = await this.jwt.verifyAsync<{
        slug: string;
        purpose: string;
      }>(token, {
        secret: this.config.get<string>('DOWNLOAD_TOKEN_SECRET'),
      });
      return payload?.slug === slug && payload.purpose === 'download';
    } catch {
      return false;
    }
  }
}
