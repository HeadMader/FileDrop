import { CleanupService } from './cleanup.service';

describe('CleanupService.freeExpiredStorage', () => {
  it('frees storage for expired uploads but keeps the record', async () => {
    const expired = { id: 'u-1', storageKey: 'uploads/a/file' };
    const prisma = {
      upload: {
        findMany: jest.fn().mockResolvedValue([expired]),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn(),
      },
    };
    const storage = { delete: jest.fn().mockResolvedValue(undefined) };
    const service = new CleanupService(prisma as never, storage as never);

    await service.freeExpiredStorage();

    const where = prisma.upload.findMany.mock.calls[0][0].where;
    expect(where.deletedAt).toBeNull();
    expect(where.storagePurgedAt).toBeNull();
    expect(where.expiresAt.lte).toBeInstanceOf(Date);
    expect(storage.delete).toHaveBeenCalledWith('uploads/a/file');
    expect(prisma.upload.update).toHaveBeenCalledWith({
      where: { id: 'u-1' },
      data: { storagePurgedAt: expect.any(Date) },
    });
    expect(prisma.upload.delete).not.toHaveBeenCalled();
  });

  it('keeps the record when storage delete fails', async () => {
    const prisma = {
      upload: {
        findMany: jest.fn().mockResolvedValue([{ id: 'u-1', storageKey: 'k' }]),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    const storage = { delete: jest.fn().mockRejectedValue(new Error('s3 down')) };
    const service = new CleanupService(prisma as never, storage as never);

    await service.freeExpiredStorage();

    expect(prisma.upload.update).not.toHaveBeenCalled();
  });
});

describe('CleanupService.purgeRemoved', () => {
  it('hard-deletes a user-removed upload after freeing its storage', async () => {
    const removed = {
      id: 'u-1',
      storageKey: 'uploads/a/file',
      storagePurgedAt: null,
    };
    const prisma = {
      upload: {
        findMany: jest.fn().mockResolvedValue([removed]),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    const storage = { delete: jest.fn().mockResolvedValue(undefined) };
    const service = new CleanupService(prisma as never, storage as never);

    await service.purgeRemoved();

    expect(storage.delete).toHaveBeenCalledWith('uploads/a/file');
    expect(prisma.upload.delete).toHaveBeenCalledWith({ where: { id: 'u-1' } });
  });

  it('skips storage delete when already purged but still removes the record', async () => {
    const old = { id: 'u-2', storageKey: 'k', storagePurgedAt: new Date() };
    const prisma = {
      upload: {
        findMany: jest.fn().mockResolvedValue([old]),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    const storage = { delete: jest.fn() };
    const service = new CleanupService(prisma as never, storage as never);

    await service.purgeRemoved();

    expect(storage.delete).not.toHaveBeenCalled();
    expect(prisma.upload.delete).toHaveBeenCalledWith({ where: { id: 'u-2' } });
  });

  it('skips DB delete when storage delete fails', async () => {
    const prisma = {
      upload: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'u-1', storageKey: 'k', storagePurgedAt: null },
        ]),
        delete: jest.fn(),
      },
    };
    const storage = {
      delete: jest.fn().mockRejectedValue(new Error('s3 down')),
    };
    const service = new CleanupService(prisma as never, storage as never);

    await service.purgeRemoved();

    expect(prisma.upload.delete).not.toHaveBeenCalled();
  });
});
