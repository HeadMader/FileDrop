import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class DownloadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async prepareDownload(slug: string, passwordOk: boolean) {
    const upload = await this.prisma.upload.findUnique({ where: { slug } });
    if (!upload || upload.deletedAt) {
      throw new NotFoundException('Not found');
    }
    if (upload.expiresAt.getTime() <= Date.now()) {
      throw new HttpException('Expired', HttpStatus.GONE);
    }
    if (upload.passwordHash && !passwordOk) {
      throw new ForbiddenException('Password required');
    }

    // Atomic increment with limit check via raw SQL
    const rows = await this.prisma.$executeRaw`
      UPDATE "Upload"
      SET "downloadCount" = "downloadCount" + 1,
          "updatedAt" = NOW()
      WHERE "id" = ${upload.id}
        AND ("downloadLimit" IS NULL OR "downloadCount" < "downloadLimit")
    `;
    if (rows === 0) {
      throw new HttpException('Download limit reached', HttpStatus.GONE);
    }

    const stream = await this.storage.download(upload.storageKey);
    return { upload, stream };
  }

  async logDownload(
    uploadId: string,
    ip: string | null,
    userAgent: string | null,
  ): Promise<void> {
    await this.prisma.downloadLog.create({
      data: { uploadId, ip, userAgent },
    });
  }
}
