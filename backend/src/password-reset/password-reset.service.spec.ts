import { BadRequestException } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';

function build() {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    passwordResetToken: {
      updateMany: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => {
      await Promise.all(ops);
      return [];
    }),
  };
  const mail = { sendPasswordReset: jest.fn().mockResolvedValue(undefined) };
  const sessions = {
    revokeAllSessionsForUser: jest.fn().mockResolvedValue(undefined),
  };
  const config = { get: jest.fn().mockReturnValue(4) };
  const service = new PasswordResetService(
    prisma as never,
    mail as never,
    sessions as never,
    config as never,
  );
  return { service, prisma, mail, sessions };
}

describe('PasswordResetService.requestReset', () => {
  it('silently no-ops when user does not exist', async () => {
    const { service, prisma, mail } = build();
    prisma.user.findUnique.mockResolvedValue(null);
    await service.requestReset('ghost@example.com');
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(mail.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('invalidates existing tokens and issues a new one', async () => {
    const { service, prisma, mail } = build();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u-1',
      email: 'a@b.c',
    });
    await service.requestReset('a@b.c');
    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'u-1' }),
        data: expect.objectContaining({ usedAt: expect.any(Date) }),
      }),
    );
    expect(prisma.passwordResetToken.create).toHaveBeenCalled();
    const createdHash =
      prisma.passwordResetToken.create.mock.calls[0][0].data.tokenHash;
    expect(createdHash).toMatch(/^[0-9a-f]{64}$/);
    expect(mail.sendPasswordReset).toHaveBeenCalledTimes(1);
    const [, token] = mail.sendPasswordReset.mock.calls[0];
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    // raw token must not equal the hash stored
    expect(token).not.toBe(createdHash);
  });
});

describe('PasswordResetService.confirmReset', () => {
  it('rejects too-short passwords', async () => {
    const { service } = build();
    await expect(service.confirmReset('tok', 'short')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects unknown token', async () => {
    const { service, prisma } = build();
    prisma.passwordResetToken.findUnique.mockResolvedValue(null);
    await expect(
      service.confirmReset('tok', 'longenoughpass'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects used token', async () => {
    const { service, prisma } = build();
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 't-1',
      userId: 'u-1',
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      service.confirmReset('tok', 'longenoughpass'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects expired token', async () => {
    const { service, prisma } = build();
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 't-1',
      userId: 'u-1',
      usedAt: null,
      expiresAt: new Date(Date.now() - 1),
    });
    await expect(
      service.confirmReset('tok', 'longenoughpass'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates password, marks token used and revokes sessions', async () => {
    const { service, prisma, sessions } = build();
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 't-1',
      userId: 'u-1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await service.confirmReset('tok', 'goodnewpass');
    expect(prisma.user.update).toHaveBeenCalled();
    const newHash = prisma.user.update.mock.calls[0][0].data.passwordHash;
    expect(newHash).toBeDefined();
    expect(newHash).not.toBe('goodnewpass');
    expect(prisma.passwordResetToken.update).toHaveBeenCalled();
    expect(sessions.revokeAllSessionsForUser).toHaveBeenCalledWith('u-1');
  });
});
