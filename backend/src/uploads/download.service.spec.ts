import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Readable } from 'stream';
import { DownloadService } from './download.service';

function build() {
  const prisma = {
    upload: { findUnique: jest.fn() },
    downloadLog: { create: jest.fn().mockResolvedValue({}) },
    $executeRaw: jest.fn(),
  };
  const storage = {
    download: jest.fn().mockResolvedValue(Readable.from(['payload'])),
  };
  const service = new DownloadService(prisma as never, storage as never);
  return { service, prisma, storage };
}

function makeUpload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u-1',
    slug: 's',
    fileName: 'f',
    fileSize: 1,
    mimeType: null,
    storageKey: 'uploads/x/f',
    passwordHash: null,
    downloadCount: 0,
    downloadLimit: null,
    expiresAt: new Date(Date.now() + 10_000),
    deletedAt: null,
    ...overrides,
  };
}

describe('DownloadService.prepareDownload', () => {
  it('throws 404 when missing or deleted', async () => {
    const { service, prisma } = build();
    prisma.upload.findUnique.mockResolvedValue(null);
    await expect(service.prepareDownload('s', false)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws 410 GONE when expired', async () => {
    const { service, prisma } = build();
    prisma.upload.findUnique.mockResolvedValue(
      makeUpload({ expiresAt: new Date(Date.now() - 1) }),
    );
    await expect(service.prepareDownload('s', false)).rejects.toMatchObject({
      status: HttpStatus.GONE,
    });
  });

  it('throws 403 when password required but not satisfied', async () => {
    const { service, prisma } = build();
    prisma.upload.findUnique.mockResolvedValue(
      makeUpload({ passwordHash: 'hash' }),
    );
    await expect(service.prepareDownload('s', false)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws 410 when atomic increment reports limit reached', async () => {
    const { service, prisma } = build();
    prisma.upload.findUnique.mockResolvedValue(
      makeUpload({ downloadLimit: 1, downloadCount: 1 }),
    );
    prisma.$executeRaw.mockResolvedValue(0);
    await expect(service.prepareDownload('s', true)).rejects.toMatchObject({
      status: HttpStatus.GONE,
    });
  });

  it('returns the stream when the atomic update succeeds', async () => {
    const { service, prisma } = build();
    prisma.upload.findUnique.mockResolvedValue(makeUpload());
    prisma.$executeRaw.mockResolvedValue(1);
    const { upload, stream } = await service.prepareDownload('s', false);
    expect(upload.slug).toBe('s');
    expect(stream).toBeDefined();
  });
});

describe('DownloadService.logDownload', () => {
  it('inserts a DownloadLog row', async () => {
    const { service, prisma } = build();
    await service.logDownload('u-1', '127.0.0.1', 'curl');
    expect(prisma.downloadLog.create).toHaveBeenCalledWith({
      data: { uploadId: 'u-1', ip: '127.0.0.1', userAgent: 'curl' },
    });
  });
});
