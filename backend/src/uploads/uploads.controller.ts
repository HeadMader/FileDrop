import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { OptionalAuthGuard } from '../common/guards/optional-auth.guard';
import type { RequestWithAuth } from '../auth/auth.types';
import { CreateUploadDto } from './dto/create-upload.dto';
import { UploadsService, type UploadedFileInput } from './uploads.service';

const ANON_COOKIE = 'anon_token';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post()
  @UseGuards(OptionalAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: UploadedFileInput | undefined,
    @Body() dto: CreateUploadDto,
    @Req() req: RequestWithAuth,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    const cookieValue = req.cookies?.[ANON_COOKIE];
    const anonToken = this.uploads.resolveAnonToken(
      typeof cookieValue === 'string' ? cookieValue : null,
    );
    if (anonToken !== cookieValue) {
      res.cookie(ANON_COOKIE, anonToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.COOKIE_SECURE === 'true',
        maxAge: THIRTY_DAYS_MS,
        path: '/',
      });
    }

    // Coerce form fields (multipart strings → numbers)
    const downloadLimit =
      dto.downloadLimit === undefined || dto.downloadLimit === null
        ? dto.downloadLimit
        : Number(dto.downloadLimit);

    return this.uploads.create(req.authUser, anonToken, file, {
      expiresIn: dto.expiresIn,
      downloadLimit: downloadLimit ?? null,
      password: dto.password,
    });
  }

  @Get(':slug')
  async getMetadata(@Param('slug') slug: string) {
    return this.uploads.getPublicMetadata(slug);
  }

  @Post(':slug/verify-password')
  @HttpCode(200)
  async verifyPassword(
    @Param('slug') slug: string,
    @Body() body: { password?: string },
  ) {
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!password) {
      throw new BadRequestException('password is required');
    }
    return this.uploads.verifyPassword(slug, password);
  }

  // Compatibility: spec defines GET /api/uploads/:slug/download under uploads
  // but download streaming lives in DownloadController for separation.

  // Helper used by the e2e tests
  static extractIp(req: Request): string | null {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string') return fwd.split(',')[0]?.trim() || null;
    return req.ip ?? null;
  }
}
