import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';

const SOFT_DELETE_GRACE_MS = 60 * 60 * 1000; // 1h

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Cron('*/15 * * * *')
  async softDeleteExpired(): Promise<void> {
    const now = new Date();
    const result = await this.prisma.upload.updateMany({
      where: {
        deletedAt: null,
        expiresAt: { lte: now },
      },
      data: { deletedAt: now },
    });
    if (result.count > 0) {
      this.logger.log(`Soft-deleted ${result.count} expired uploads`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupStorage(): Promise<void> {
    const cutoff = new Date(Date.now() - SOFT_DELETE_GRACE_MS);
    const stale = await this.prisma.upload.findMany({
      where: {
        deletedAt: { not: null, lte: cutoff },
      },
      take: 100,
    });
    for (const upload of stale) {
      try {
        await this.storage.delete(upload.storageKey);
      } catch (err) {
        this.logger.warn(
          `Failed to delete storage key ${upload.storageKey}: ${(err as Error).message}`,
        );
        continue;
      }
      await this.prisma.upload.delete({ where: { id: upload.id } });
    }
    if (stale.length > 0) {
      this.logger.log(`Cleaned ${stale.length} soft-deleted uploads`);
    }
  }
}
