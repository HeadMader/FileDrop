import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CsrfGuard } from '../auth/csrf.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('health')
  health() {
    return this.admin.health();
  }

  @Get('export')
  async export(
    @Query('type') type: 'uploads' | 'users' | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const kind: 'uploads' | 'users' = type === 'users' ? 'users' : 'uploads';
    const csv = await this.admin.exportCsv(kind);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${kind}-${Date.now()}.csv"`,
    );
    res.send(csv);
  }

  @Get('uploads')
  listUploads(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: 'newest' | 'oldest' | 'largest' | 'most_downloaded',
    @Query('status') status?: 'all' | 'active' | 'expired',
    @Query('search') search?: string,
    @Query('userId') userId?: string,
    @Query('anonymous') anonymous?: string,
  ) {
    return this.admin.listUploads({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort,
      status,
      search,
      userId,
      anonymous: anonymous === 'true',
    });
  }

  @Get('uploads/:id')
  uploadDetail(@Param('id') id: string) {
    return this.admin.uploadDetail(id);
  }

  @Delete('uploads/:id')
  @UseGuards(CsrfGuard)
  removeUpload(@Param('id') id: string) {
    return this.admin.removeUpload(id);
  }

  @Get('users')
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.admin.listUsers({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }
}
