import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';

function build() {
  const prisma = {
    upload: {
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: {} }),
      fields: { downloadLimit: 'downloadLimit' },
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  const storage = { delete: jest.fn().mockResolvedValue(undefined) };
  const config = { get: jest.fn().mockReturnValue(10) };
  const service = new DashboardService(
    prisma as never,
    storage as never,
    config as never,
  );
  return { service, prisma, storage };
}

function makeUpload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'up-1',
    userId: 'user-1',
    slug: 'slug',
    fileName: 'f.txt',
    fileSize: 100,
    mimeType: null,
    storageKey: 'uploads/x/f',
    passwordHash: null,
    downloadCount: 0,
    downloadLimit: 5,
    expiresAt: new Date(Date.now() + 60_000),
    deletedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('DashboardService.update', () => {
  it('throws 404 when upload missing', async () => {
    const { service, prisma } = build();
    prisma.upload.findFirst.mockResolvedValue(null);
    await expect(
      service.update('user-1', 'up-1', { fileName: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws 409 when already expired', async () => {
    const { service, prisma } = build();
    prisma.upload.findFirst.mockResolvedValue(
      makeUpload({ expiresAt: new Date(Date.now() - 1000) }),
    );
    await expect(
      service.update('user-1', 'up-1', { fileName: 'x' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects password + removePassword together', async () => {
    const { service, prisma } = build();
    prisma.upload.findFirst.mockResolvedValue(makeUpload());
    await expect(
      service.update('user-1', 'up-1', {
        password: 'secret',
        removePassword: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects downloadLimit below current downloadCount', async () => {
    const { service, prisma } = build();
    prisma.upload.findFirst.mockResolvedValue(
      makeUpload({ downloadCount: 5 }),
    );
    await expect(
      service.update('user-1', 'up-1', { downloadLimit: 3 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('clears passwordHash when removePassword=true', async () => {
    const { service, prisma } = build();
    prisma.upload.findFirst.mockResolvedValue(
      makeUpload({ passwordHash: 'hash' }),
    );
    prisma.upload.update.mockImplementation(async ({ data }: any) => ({
      ...makeUpload(),
      ...data,
    }));
    await service.update('user-1', 'up-1', { removePassword: true });
    const callData = prisma.upload.update.mock.calls[0][0].data;
    expect(callData.passwordHash).toBeNull();
  });

  it('hashes new password (no plaintext stored)', async () => {
    const { service, prisma } = build();
    prisma.upload.findFirst.mockResolvedValue(makeUpload());
    prisma.upload.update.mockImplementation(async ({ data }: any) => ({
      ...makeUpload(),
      ...data,
    }));
    await service.update('user-1', 'up-1', { password: 'newpass' });
    const callData = prisma.upload.update.mock.calls[0][0].data;
    expect(callData.passwordHash).toBeDefined();
    expect(callData.passwordHash).not.toBe('newpass');
  });
});

describe('DashboardService.remove', () => {
  it('soft-deletes and tries to remove from storage', async () => {
    const { service, prisma, storage } = build();
    prisma.upload.findFirst.mockResolvedValue(makeUpload());
    prisma.upload.update.mockResolvedValue({});
    const result = await service.remove('user-1', 'up-1');
    expect(result.success).toBe(true);
    expect(storage.delete).toHaveBeenCalledWith('uploads/x/f');
    expect(prisma.upload.update.mock.calls[0][0].data.deletedAt).toBeInstanceOf(
      Date,
    );
  });

  it('still soft-deletes even if storage throws', async () => {
    const { service, prisma, storage } = build();
    prisma.upload.findFirst.mockResolvedValue(makeUpload());
    prisma.upload.update.mockResolvedValue({});
    storage.delete.mockRejectedValue(new Error('s3 down'));
    await expect(service.remove('user-1', 'up-1')).resolves.toEqual({
      success: true,
    });
    expect(prisma.upload.update).toHaveBeenCalled();
  });
});
