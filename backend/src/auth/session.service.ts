import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma.service';
import { CsrfService } from './csrf.service';
import { getSessionTtlMs } from './auth.constants';
import type { SessionRequestMetadata } from './auth.types';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly csrfService: CsrfService,
  ) {}

  async createSession(userId: string, metadata: SessionRequestMetadata) {
    const sessionToken = randomBytes(32).toString('base64url');
    const csrfToken = this.csrfService.generateToken();

    const now = Date.now();
    const expiresAt = new Date(now + getSessionTtlMs());

    const session = await this.prisma.session.create({
      data: {
        userId,
        tokenHash: this.hashToken(sessionToken),
        csrfHash: this.csrfService.hashToken(csrfToken),
        expiresAt,
        lastSeenAt: new Date(now),
        ip: metadata.ip,
        userAgent: metadata.userAgent,
      },
    });

    return {
      sessionId: session.id,
      sessionToken,
      csrfToken,
      expiresAt,
    };
  }

  async findActiveSessionByToken(sessionToken: string) {
    const session = await this.prisma.session.findFirst({
      where: {
        tokenHash: this.hashToken(sessionToken),
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      return null;
    }

    void this.prisma.session
      .update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      })
      .catch(() => undefined);

    return session;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllSessionsForUser(userId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
