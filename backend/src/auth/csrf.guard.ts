import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CSRF_COOKIE_NAME } from './auth.constants';
import { CsrfService } from './csrf.service';
import type { RequestWithAuth } from './auth.types';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly csrfService: CsrfService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const session = request.authSession;

    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }

    const tokenFromHeader = request.header('x-csrf-token');
    const cookies = request.cookies;
    const tokenFromCookieValue = cookies[CSRF_COOKIE_NAME];
    const tokenFromCookie =
      typeof tokenFromCookieValue === 'string' ? tokenFromCookieValue : null;

    if (!tokenFromHeader || !tokenFromCookie) {
      throw new ForbiddenException('Missing CSRF token');
    }

    if (
      !this.csrfService.isValid(
        tokenFromHeader,
        tokenFromCookie,
        session.csrfHash,
      )
    ) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}
