import { CleanupService } from './cleanup.service';

describe('CleanupService.softDeleteExpired', () => {
  it('updates uploads whose expiresAt is in the past', async () => {
    const prisma = {
      upload: {
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
    };
    const storage = { delete: jest.fn() };
    const service = new CleanupService(prisma as never, storage as never);

    await service.softDeleteExpired();

    expect(prisma.upload.updateMany).toHaveBeenCalledTimes(1);
    const call = prisma.upload.updateMany.mock.calls[0][0];
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.expiresAt.lte).toBeInstanceOf(Date);
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });
});

describe('CleanupService.cleanupStorage', () => {
  it('hard-deletes uploads whose deletedAt is older than 1h after removing storage', async () => {
    const oldUpload = {
      id: 'u-1',
      storageKey: 'uploads/a/file',
    };
    const prisma = {
      upload: {
        findMany: jest.fn().mockResolvedValue([oldUpload]),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    const storage = { delete: jest.fn().mockResolvedValue(undefined) };
    const service = new CleanupService(prisma as never, storage as never);

    await service.cleanupStorage();

    expect(storage.delete).toHaveBeenCalledWith('uploads/a/file');
    expect(prisma.upload.delete).toHaveBeenCalledWith({ where: { id: 'u-1' } });
  });

  it('skips DB delete when storage delete fails', async () => {
    const prisma = {
      upload: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'u-1', storageKey: 'uploads/a/file' },
        ]),
        delete: jest.fn(),
      },
    };
    const storage = {
      delete: jest.fn().mockRejectedValue(new Error('s3 down')),
    };
    const service = new CleanupService(prisma as never, storage as never);

    await service.cleanupStorage();

    expect(storage.delete).toHaveBeenCalled();
    expect(prisma.upload.delete).not.toHaveBeenCalled();
  });
});
