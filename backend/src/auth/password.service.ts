import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const DEFAULT_BCRYPT_ROUNDS = 12;

function parseBcryptRounds(rawValue: string | undefined): number {
  if (!rawValue) {
    return DEFAULT_BCRYPT_ROUNDS;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 8 || parsed > 15) {
    return DEFAULT_BCRYPT_ROUNDS;
  }

  return parsed;
}

@Injectable()
export class PasswordService {
  private readonly rounds = parseBcryptRounds(process.env.BCRYPT_ROUNDS);

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.rounds);
  }

  async verifyPassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    if (!passwordHash) {
      return false;
    }

    return bcrypt.compare(password, passwordHash);
  }
}
