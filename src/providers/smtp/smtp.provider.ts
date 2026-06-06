import { createTransport } from 'nodemailer';
import {
  EmailPayload,
  EmailSendResult,
  IEmailProvider,
} from 'src/common/interfaces/email-provider.interface';
import { SmtpConfig } from './smtp-config.interface';

export class SmtpProvider implements IEmailProvider {
  constructor(private readonly config: SmtpConfig) {}

  /**
   * Sends an email with the tenant SMTP credentials.
   */
  async send(payload: EmailPayload): Promise<EmailSendResult> {
    const transport = createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: { user: this.config.user, pass: this.config.pass },
    });

    const result = await transport.sendMail({
      from: `${this.config.fromName || 'MailWorks'} <${this.config.user}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.content,
    });

    return { messageId: result.messageId };
  }
}
