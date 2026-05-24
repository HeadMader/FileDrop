import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PasswordService } from './password.service';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureEnvAdmin();
  }

  private async ensureEnvAdmin(): Promise<void> {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const firstName = process.env.ADMIN_FIRSTNAME?.trim() || null;
    const lastName = process.env.ADMIN_LASTNAME?.trim() || null;

    if (!email || !password) {
      return;
    }

    if (password.length < 8 || password.length > 72) {
      this.logger.warn(
        'Skipping admin bootstrap: ADMIN_PASSWORD must be 8-72 characters',
      );
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const passwordHash = await this.passwordService.hashPassword(password);
      await this.prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          role: 'ADMIN',
          passwordHash,
        },
      });
      this.logger.log(`Bootstrapped admin account for ${email}`);
      return;
    }

    const updateData: {
      role?: 'ADMIN';
      passwordHash?: string;
    } = {};

    if (user.role !== 'ADMIN') {
      updateData.role = 'ADMIN';
    }

    if (!user.passwordHash) {
      updateData.passwordHash =
        await this.passwordService.hashPassword(password);
    }

    if (Object.keys(updateData).length === 0) {
      return;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    this.logger.log(`Updated existing account with admin access for ${email}`);
  }
}
