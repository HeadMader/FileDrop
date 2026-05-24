import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { PublicUser } from '../auth/auth.types';
import { CsrfGuard } from '../auth/csrf.guard';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { UpdateUploadDto } from '../uploads/dto/upload-settings.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(SessionAuthGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('uploads')
  list(
    @CurrentUser() user: PublicUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: 'newest' | 'oldest' | 'largest' | 'most_downloaded',
    @Query('status') status?: 'all' | 'active' | 'expired',
    @Query('search') search?: string,
  ) {
    return this.dashboard.list(user.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort,
      status,
      search,
    });
  }

  @Get('uploads/:id')
  detail(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.dashboard.detail(user.id, id);
  }

  @Patch('uploads/:id')
  @UseGuards(CsrfGuard)
  update(
    @CurrentUser() user: PublicUser,
    @Param('id') id: string,
    @Body() body: UpdateUploadDto,
  ) {
    return this.dashboard.update(user.id, id, body);
  }

  @Delete('uploads/:id')
  @UseGuards(CsrfGuard)
  remove(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.dashboard.remove(user.id, id);
  }

  @Get('stats')
  stats(
    @CurrentUser() user: PublicUser,
    @Query('period') period?: '7d' | '30d' | '90d',
  ) {
    return this.dashboard.stats(user.id, period ?? '7d');
  }
}
