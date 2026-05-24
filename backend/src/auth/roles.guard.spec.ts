import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../generated/prisma/enums';
import type { PublicUser, RequestWithAuth } from './auth.types';
import { ROLES_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';

function makeContext(request: Partial<RequestWithAuth>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: <T>() => request as T,
      getResponse: <T>() => ({}) as T,
      getNext: <T>() => ({}) as T,
    }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

function makeReflector(roles: Role[] | undefined): Reflector {
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockImplementation((key: string) =>
      key === ROLES_KEY ? roles : undefined,
    );
  return reflector;
}

function user(role: Role): PublicUser {
  return {
    id: 'u1',
    email: 'u@example.com',
    firstName: null,
    lastName: null,
    role,
    createdAt: new Date(),
  };
}

describe('RolesGuard', () => {
  it('allows when no @Roles metadata is set', () => {
    const guard = new RolesGuard(makeReflector(undefined));
    const ctx = makeContext({ authUser: user(Role.USER) });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows when metadata is an empty array', () => {
    const guard = new RolesGuard(makeReflector([]));
    const ctx = makeContext({ authUser: user(Role.USER) });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws Unauthorized when roles are required but no authUser is present', () => {
    const guard = new RolesGuard(makeReflector([Role.ADMIN]));
    const ctx = makeContext({});

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws Forbidden when authUser role does not match any required role', () => {
    const guard = new RolesGuard(makeReflector([Role.ADMIN]));
    const ctx = makeContext({ authUser: user(Role.USER) });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows when authUser role matches a required role', () => {
    const guard = new RolesGuard(makeReflector([Role.ADMIN]));
    const ctx = makeContext({ authUser: user(Role.ADMIN) });

    expect(guard.canActivate(ctx)).toBe(true);
  });
});
