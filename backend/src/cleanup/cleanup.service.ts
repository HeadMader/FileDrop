import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';

// Grace before an expired upload's stored bytes are freed (the record is kept).
const STORAGE_GRACE_MS = 60 * 60 * 1000; // 1h
// How long an expired upload's metadata is kept as history before final purge.
const HISTORY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000; // 90d

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Free the stored bytes of expired uploads but KEEP the metadata record so
   * owner/admin dashboards can still list them as "expired". Expiry never sets
   * `deletedAt` — that marker is reserved for user/admin removals.
   */
  @Cron('*/15 * * * *')
  async freeExpiredStorage(): Promise<void> {
    const cutoff = new Date(Date.now() - STORAGE_GRACE_MS);
    const expired = await this.prisma.upload.findMany({
      where: {
        deletedAt: null,
        storagePurgedAt: null,
        expiresAt: { lte: cutoff },
      },
      take: 100,
    });
    let freed = 0;
    for (const upload of expired) {
      try {
        await this.storage.delete(upload.storageKey);
      } catch (err) {
        this.logger.warn(
          `Failed to free storage key ${upload.storageKey}: ${(err as Error).message}`,
        );
        continue;
      }
      await this.prisma.upload.update({
        where: { id: upload.id },
        data: { storagePurgedAt: new Date() },
      });
      freed++;
    }
    if (freed > 0) {
      this.logger.log(`Freed storage for ${freed} expired uploads (records kept)`);
    }
  }

  /**
   * Permanently remove uploads a user/admin deleted (after a short grace) and
   * expired records older than the history-retention window.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async purgeRemoved(): Promise<void> {
    const removedCutoff = new Date(Date.now() - STORAGE_GRACE_MS);
    const historyCutoff = new Date(Date.now() - HISTORY_RETENTION_MS);
    const stale = await this.prisma.upload.findMany({
      where: {
        OR: [
          { deletedAt: { not: null, lte: removedCutoff } },
          { expiresAt: { lte: historyCutoff } },
        ],
      },
      take: 100,
    });
    let purged = 0;
    for (const upload of stale) {
      if (!upload.storagePurgedAt) {
        try {
          await this.storage.delete(upload.storageKey);
        } catch (err) {
          this.logger.warn(
            `Failed to delete storage key ${upload.storageKey}: ${(err as Error).message}`,
          );
          continue;
        }
      }
      await this.prisma.upload.delete({ where: { id: upload.id } });
      purged++;
    }
    if (purged > 0) {
      this.logger.log(`Purged ${purged} removed/old uploads`);
    }
  }
}
