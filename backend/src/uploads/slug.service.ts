import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { PrismaService } from '../prisma.service';

const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

@Injectable()
export class SlugService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(): Promise<string> {
    const lengths = [8, 8, 10, 10, 12];
    for (const length of lengths) {
      const slug = customAlphabet(ALPHABET, length)();
      const existing = await this.prisma.upload.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!existing) {
        return slug;
      }
    }
    throw new InternalServerErrorException('Failed to generate unique slug');
  }
}
