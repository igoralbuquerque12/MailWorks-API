import { Controller, Body, Post, HttpCode } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDTO } from './dto/send-email-dto';

@Controller('email')
export class EmailController {
  constructor(private emailService: EmailService) {}

  @Post()
  @HttpCode(200)
  sendEmail(@Body() emailInformation: SendEmailDTO) {
    return this.emailService.send(emailInformation);
  }
}
