import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { SendEmailDTO } from './dto/send-email-dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  async sent(emailInformation: SendEmailDTO): Promise<void> {
    try {
      const email = this.configService.get<string>('EMAIL');
      const password = this.configService.get<string>('PASSWORD_EMAIL');

      if (!email || !password)
        throw new Error('Credenciais de email não configuradas');

      const transport: Transporter = createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: email,
          pass: password,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      await transport.verify();

      const { to, subject, content } = emailInformation;

      await transport.sendMail({
        from: `Services Igor A. <${email}>`,
        to: to,
        subject: subject,
        html: `<p>${content}</p>`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao enviar email:', errorMessage);
      throw error;
    }
  }
}
