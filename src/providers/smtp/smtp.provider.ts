import { createTransport } from 'nodemailer';

import {
  IEmailProvider,
  EmailPayload,
} from 'src/common/interfaces/email-provider.interface';
import { SmtpConfig } from './entities/smtp-config.entity';

export class SmtpProvider implements IEmailProvider {
  constructor(private readonly config: SmtpConfig) { }

  async send(payload: EmailPayload): Promise<void> {
    const transport = createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
    });

    await transport.sendMail({
      from: `${this.config.fromName || 'MailWorks'} <${this.config.user}>`,
      to: payload.to,
      subject: payload.subject,
      html: `<p>${payload.content}</p>`,
    });
  }
}
