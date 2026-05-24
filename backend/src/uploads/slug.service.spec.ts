import { InternalServerErrorException } from '@nestjs/common';
import { SlugService } from './slug.service';

describe('SlugService', () => {
  it('returns the slug when prisma reports it is unique', async () => {
    const prisma = {
      upload: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new SlugService(prisma as never);

    const slug = await service.generate();

    expect(slug).toMatch(/^[0-9A-Za-z]{8}$/);
    expect(prisma.upload.findUnique).toHaveBeenCalledTimes(1);
  });

  it('retries when collisions occur and eventually throws', async () => {
    const prisma = {
      upload: {
        findUnique: jest.fn().mockResolvedValue({ id: 'x' }),
      },
    };
    const service = new SlugService(prisma as never);

    await expect(service.generate()).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    // 5 attempts: 8, 8, 10, 10, 12
    expect(prisma.upload.findUnique).toHaveBeenCalledTimes(5);
  });

  it('retries until a free slug is found', async () => {
    const prisma = {
      upload: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: 'x' })
          .mockResolvedValueOnce({ id: 'y' })
          .mockResolvedValueOnce(null),
      },
    };
    const service = new SlugService(prisma as never);

    const slug = await service.generate();

    expect(slug).toBeDefined();
    expect(prisma.upload.findUnique).toHaveBeenCalledTimes(3);
  });
});
