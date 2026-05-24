import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SESSION_COOKIE_NAME } from './auth.constants';
import { SessionService } from './session.service';
import { toPublicUser, type RequestWithAuth } from './auth.types';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const cookies = request.cookies;
    const sessionTokenValue = cookies[SESSION_COOKIE_NAME];
    const sessionToken =
      typeof sessionTokenValue === 'string' ? sessionTokenValue : null;

    if (!sessionToken) {
      throw new UnauthorizedException('Authentication required');
    }

    const session =
      await this.sessionService.findActiveSessionByToken(sessionToken);
    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    request.authUser = toPublicUser(session.user);
    request.authSession = {
      id: session.id,
      userId: session.userId,
      csrfHash: session.csrfHash,
      expiresAt: session.expiresAt,
    };

    return true;
  }
}
