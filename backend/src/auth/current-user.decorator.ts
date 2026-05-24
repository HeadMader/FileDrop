import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PublicUser, RequestWithAuth } from './auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PublicUser | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
    return request.authUser;
  },
);
