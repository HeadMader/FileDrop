import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { SwaggerSyncModule } from 'nestjs-swagger-sync';
import { DocsController } from './docs.controller';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CleanupModule } from './cleanup/cleanup.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MailModule } from './mail/mail.module';
import { PasswordResetModule } from './password-reset/password-reset.module';
import { PrismaModule } from './prisma.module';
import { StorageModule } from './storage/storage.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },
    ]),
    SwaggerSyncModule.register({
      apiKey: process.env.POSTMAN_API_KEY || '',
      swaggerPath: 'api/docs',
      baseUrl: process.env.SWAGGER_BASE_URL || 'http://localhost:3000',
      collectionName: 'FileDrop API',
      runTest: false,
      ignorePathWithBearerToken: [],
    }),
    PrismaModule,
    MailModule,
    StorageModule,
    AuthModule,
    UploadsModule,
    DashboardModule,
    AdminModule,
    PasswordResetModule,
    CleanupModule,
  ],
  controllers: [DocsController],
})
export class AppModule {}
