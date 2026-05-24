import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { OptionalAuthGuard } from '../common/guards/optional-auth.guard';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfGuard } from './csrf.guard';
import { CsrfService } from './csrf.service';
import { PasswordService } from './password.service';
import { RolesGuard } from './roles.guard';
import { SessionAuthGuard } from './session-auth.guard';
import { SessionService } from './session.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    CsrfService,
    SessionService,
    SessionAuthGuard,
    CsrfGuard,
    RolesGuard,
    OptionalAuthGuard,
    AdminBootstrapService,
  ],
  exports: [
    SessionService,
    CsrfService,
    SessionAuthGuard,
    CsrfGuard,
    RolesGuard,
    OptionalAuthGuard,
  ],
})
export class AuthModule {}
