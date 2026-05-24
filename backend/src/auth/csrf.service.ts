import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

@Injectable()
export class CsrfService {
  generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  isValid(
    tokenFromHeader: string,
    tokenFromCookie: string,
    storedTokenHash: string,
  ): boolean {
    if (!this.secureEquals(tokenFromHeader, tokenFromCookie)) {
      return false;
    }

    const providedHash = this.hashToken(tokenFromHeader);
    return this.secureEquals(providedHash, storedTokenHash);
  }

  private secureEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}
