import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Readable } from 'stream';
import { UploadsService } from './uploads.service';
import { DownloadService } from './download.service';

@Controller('uploads')
export class DownloadController {
  constructor(
    private readonly uploads: UploadsService,
    private readonly download: DownloadService,
  ) {}

  @Get(':slug/download')
  async stream(
    @Param('slug') slug: string,
    @Query('token') token: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const passwordOk = token
      ? await this.uploads.verifyDownloadToken(slug, token)
      : false;
    const { upload, stream } = await this.download.prepareDownload(
      slug,
      passwordOk,
    );

    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim() ?? null
        : null) ?? req.ip ?? null;
    const ua = req.get('user-agent') ?? null;

    // fire-and-forget download log
    void this.download.logDownload(upload.id, ip, ua);

    res.setHeader(
      'Content-Type',
      upload.mimeType ?? 'application/octet-stream',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(upload.fileName)}"`,
    );
    res.setHeader('Content-Length', String(upload.fileSize));
    res.setHeader('Cache-Control', 'no-store');

    (stream as Readable).on('error', () => {
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.end();
      }
    });
    (stream as Readable).pipe(res);
  }
}
