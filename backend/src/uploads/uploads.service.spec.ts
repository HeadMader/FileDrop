import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { UploadsService, type UploadedFileInput } from './uploads.service';
import type { PublicUser } from '../auth/auth.types';

function makeFile(overrides: Partial<UploadedFileInput> = {}): UploadedFileInput {
  return {
    originalname: 'hello.txt',
    mimetype: 'text/plain',
    size: 1024,
    buffer: Buffer.from('hello world'),
    ...overrides,
  };
}

interface Mocks {
  prisma: any;
  storage: { upload: jest.Mock; delete: jest.Mock; download: jest.Mock };
  slugs: { generate: jest.Mock };
  config: { get: jest.Mock };
  jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
}

function build(): { service: UploadsService; mocks: Mocks } {
  const mocks: Mocks = {
    prisma: {
      upload: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(async ({ data }: any) => ({
          ...data,
          downloadCount: 0,
          deletedAt: null,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
          checksum: data.checksum,
          mimeType: data.mimeType ?? null,
        })),
        findUnique: jest.fn(),
      },
    },
    storage: {
      upload: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      download: jest.fn(),
    },
    slugs: { generate: jest.fn().mockResolvedValue('AbCdEfGh') },
    config: {
      get: jest.fn((key: string) => {
        if (key === 'MAX_FILE_SIZE_ANON_MB') return 50;
        if (key === 'MAX_FILE_SIZE_USER_MB') return 500;
        if (key === 'DOWNLOAD_TOKEN_SECRET') return 'test-secret';
        return undefined;
      }),
    },
    jwt: {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest.fn(),
    },
  };

  const service = new UploadsService(
    mocks.prisma,
    mocks.storage as never,
    mocks.slugs as never,
    mocks.config as never,
    mocks.jwt as never,
  );

  return { service, mocks };
}

const anonUser: PublicUser | undefined = undefined;
const user = {
  id: 'user-1',
  email: 'a@b.c',
  role: 'USER',
  firstName: null,
  lastName: null,
  createdAt: new Date(),
} as unknown as PublicUser;

describe('UploadsService.sanitizeFileName', () => {
  const { service } = build();
  it('strips traversal segments', () => {
    expect(service.sanitizeFileName('../../etc/passwd')).toBe('passwd');
  });
  it('strips angle brackets and newlines', () => {
    expect(service.sanitizeFileName('a<b>\nc.txt')).toBe('abc.txt');
  });
  it('truncates to 255 chars', () => {
    const long = 'a'.repeat(400) + '.txt';
    expect(service.sanitizeFileName(long).length).toBe(255);
  });
  it('falls back to "file" when stripped to empty', () => {
    expect(service.sanitizeFileName('')).toBe('file');
  });
});

describe('UploadsService.resolveAnonToken', () => {
  const { service } = build();
  it('reuses existing cookie value', () => {
    expect(service.resolveAnonToken('existing-token')).toBe('existing-token');
  });
  it('generates a new one when missing', () => {
    const token = service.resolveAnonToken(null);
    expect(token).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('UploadsService.create — anonymous rules', () => {
  it('rejects file larger than the anon limit', async () => {
    const { service } = build();
    const big = makeFile({ size: 51 * 1024 * 1024 });
    await expect(
      service.create(anonUser, 'tok', big, {
        expiresIn: '1h',
        downloadLimit: 1,
      }),
    ).rejects.toMatchObject({ status: HttpStatus.PAYLOAD_TOO_LARGE });
  });

  it('rejects 30d expiration for anon', async () => {
    const { service } = build();
    await expect(
      service.create(anonUser, 'tok', makeFile(), {
        expiresIn: '30d',
        downloadLimit: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires a download limit for anon', async () => {
    const { service } = build();
    await expect(
      service.create(anonUser, 'tok', makeFile(), {
        expiresIn: '1h',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects downloadLimit above the anon cap of 100', async () => {
    const { service } = build();
    await expect(
      service.create(anonUser, 'tok', makeFile(), {
        expiresIn: '1h',
        downloadLimit: 101,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when anon already has 10 active uploads', async () => {
    const { service, mocks } = build();
    mocks.prisma.upload.count.mockResolvedValue(10);
    await expect(
      service.create(anonUser, 'tok', makeFile(), {
        expiresIn: '1h',
        downloadLimit: 1,
      }),
    ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
  });

  it('creates anon upload and stores under uploads/<uuid>/<sanitized>', async () => {
    const { service, mocks } = build();
    const result = await service.create(anonUser, 'tok-1', makeFile(), {
      expiresIn: '1h',
      downloadLimit: 3,
    });
    expect(result.shareUrl).toBe('/s/AbCdEfGh');
    expect(result.hasPassword).toBe(false);
    expect(mocks.storage.upload).toHaveBeenCalledTimes(1);
    const [key] = mocks.storage.upload.mock.calls[0];
    expect(key).toMatch(/^uploads\/[0-9a-f-]{36}\/hello\.txt$/);
    expect(mocks.prisma.upload.create).toHaveBeenCalledTimes(1);
    const data = mocks.prisma.upload.create.mock.calls[0][0].data;
    expect(data.userId).toBeNull();
    expect(data.anonToken).toBe('tok-1');
    expect(data.passwordHash).toBeNull();
  });
});

describe('UploadsService.create — user rules', () => {
  it('allows large file up to the user cap', async () => {
    const { service } = build();
    const big = makeFile({ size: 400 * 1024 * 1024 });
    const result = await service.create(user, 'ignored', big, {
      expiresIn: '30d',
      downloadLimit: null,
    });
    expect(result.slug).toBe('AbCdEfGh');
  });

  it('rejects file larger than the user cap', async () => {
    const { service } = build();
    const big = makeFile({ size: 600 * 1024 * 1024 });
    await expect(
      service.create(user, 'ignored', big, {
        expiresIn: '30d',
        downloadLimit: null,
      }),
    ).rejects.toMatchObject({ status: HttpStatus.PAYLOAD_TOO_LARGE });
  });

  it('rejects password shorter than 4 chars', async () => {
    const { service } = build();
    await expect(
      service.create(user, '', makeFile(), {
        expiresIn: '1h',
        downloadLimit: null,
        password: 'abc',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hashes user password and stores it', async () => {
    const { service, mocks } = build();
    await service.create(user, '', makeFile(), {
      expiresIn: '1h',
      downloadLimit: null,
      password: 'secret-pw',
    });
    const data = mocks.prisma.upload.create.mock.calls[0][0].data;
    expect(data.passwordHash).toBeDefined();
    expect(data.passwordHash).not.toBe('secret-pw');
    expect(data.userId).toBe(user.id);
    expect(data.anonToken).toBeNull();
  });
});

describe('UploadsService.getPublicMetadata', () => {
  it('throws 404 for missing or soft-deleted upload', async () => {
    const { service, mocks } = build();
    mocks.prisma.upload.findUnique.mockResolvedValue(null);
    await expect(service.getPublicMetadata('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws 410 GONE when expired', async () => {
    const { service, mocks } = build();
    mocks.prisma.upload.findUnique.mockResolvedValue({
      slug: 's',
      fileName: 'f',
      fileSize: 1,
      mimeType: null,
      passwordHash: null,
      downloadCount: 0,
      downloadLimit: null,
      expiresAt: new Date(Date.now() - 1000),
      deletedAt: null,
      createdAt: new Date(),
    });
    await expect(service.getPublicMetadata('s')).rejects.toMatchObject({
      status: HttpStatus.GONE,
    });
  });

  it('returns metadata with hasPassword flag', async () => {
    const { service, mocks } = build();
    mocks.prisma.upload.findUnique.mockResolvedValue({
      slug: 's',
      fileName: 'f',
      fileSize: 1,
      mimeType: 'text/plain',
      passwordHash: 'hash',
      downloadCount: 0,
      downloadLimit: 5,
      expiresAt: new Date(Date.now() + 10_000),
      deletedAt: null,
      createdAt: new Date(),
    });
    const result = await service.getPublicMetadata('s');
    expect(result.hasPassword).toBe(true);
    expect(result.isAvailable).toBe(true);
  });
});

describe('UploadsService.verifyDownloadToken', () => {
  it('returns true for matching slug + purpose', async () => {
    const { service, mocks } = build();
    mocks.jwt.verifyAsync.mockResolvedValue({ slug: 's', purpose: 'download' });
    await expect(service.verifyDownloadToken('s', 'tok')).resolves.toBe(true);
  });
  it('returns false for slug mismatch', async () => {
    const { service, mocks } = build();
    mocks.jwt.verifyAsync.mockResolvedValue({
      slug: 'other',
      purpose: 'download',
    });
    await expect(service.verifyDownloadToken('s', 'tok')).resolves.toBe(false);
  });
  it('returns false when verify throws', async () => {
    const { service, mocks } = build();
    mocks.jwt.verifyAsync.mockRejectedValue(new Error('bad'));
    await expect(service.verifyDownloadToken('s', 'tok')).resolves.toBe(false);
  });
});
