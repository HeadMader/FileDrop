import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { DownloadController } from './download.controller';
import { DownloadService } from './download.service';
import { SlugService } from './slug.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [AuthModule, StorageModule, JwtModule.register({})],
  controllers: [UploadsController, DownloadController],
  providers: [UploadsService, DownloadService, SlugService],
  exports: [UploadsService],
})
export class UploadsModule {}
