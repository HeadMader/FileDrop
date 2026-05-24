import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SESSION_COOKIE_NAME } from '../../auth/auth.constants';
import { SessionService } from '../../auth/session.service';
import { toPublicUser, type RequestWithAuth } from '../../auth/auth.types';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const sessionTokenValue = request.cookies?.[SESSION_COOKIE_NAME];

    if (typeof sessionTokenValue !== 'string' || !sessionTokenValue) {
      return true;
    }

    try {
      const session =
        await this.sessionService.findActiveSessionByToken(sessionTokenValue);
      if (session) {
        request.authUser = toPublicUser(session.user);
        request.authSession = {
          id: session.id,
          userId: session.userId,
          csrfHash: session.csrfHash,
          expiresAt: session.expiresAt,
        };
      }
    } catch {
      // invalid/expired session — treat as anonymous
    }

    return true;
  }
}
