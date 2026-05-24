import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';

@Controller('auth')
export class PasswordResetController {
  constructor(private readonly service: PasswordResetService) {}

  @Post('forgot-password')
  @HttpCode(200)
  async forgot(@Body() body: { email?: string }) {
    const email = (body?.email ?? '').trim();
    if (email) await this.service.requestReset(email);
    return { success: true };
  }

  @Post('reset-password')
  @HttpCode(200)
  async reset(@Body() body: { token?: string; password?: string }) {
    if (!body?.token || !body?.password) {
      throw new BadRequestException('token and password are required');
    }
    await this.service.confirmReset(body.token, body.password);
    return { success: true };
  }
}
