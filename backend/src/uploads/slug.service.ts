import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

let customAlphabetLoader:
  | Promise<(
      alphabet: string,
      defaultSize?: number,
    ) => (size?: number) => string>
  | null = null;

function loadCustomAlphabet() {
  if (!customAlphabetLoader) {
    customAlphabetLoader = import('nanoid').then((mod) => mod.customAlphabet);
  }
  return customAlphabetLoader;
}

@Injectable()
export class SlugService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(): Promise<string> {
    const customAlphabet = await loadCustomAlphabet();
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
