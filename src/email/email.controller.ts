import { Controller, Body, Post, HttpCode, Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDTO } from './dto/send-email-dto';

@Controller('email')
export class EmailController {
  constructor(private emailService: EmailService) {}

  private readonly logger = new Logger(EmailController.name);

  @Post()
  @HttpCode(200)
  sendEmail(@Body() emailInformation: SendEmailDTO): string {
    this.emailService.sent(emailInformation).catch((error) => {
      this.logger.error('Error with e-mail service: ', error);
    });
    return 'Your email has been sent!';
  }
}
