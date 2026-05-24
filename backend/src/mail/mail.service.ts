import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = Number(config.get('SMTP_PORT') ?? 587);
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASSWORD');
    this.from = config.get<string>('SMTP_FROM') ?? 'no-reply@filedrop.local';
    this.frontendUrl =
      config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/reset-password?token=${token}`;
    if (!this.transporter) {
      this.logger.log(`[DEV MAIL] password reset link for ${email}: ${link}`);
      return;
    }
    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'Reset your FileDrop password',
      text: `Reset your password using this link (valid 1 hour): ${link}`,
      html: `<p>Reset your password using <a href="${link}">this link</a> (valid 1 hour).</p>`,
    });
  }
}
