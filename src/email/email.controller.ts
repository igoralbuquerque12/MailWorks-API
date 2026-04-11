import {
  Controller,
  Body,
  Post,
  HttpCode,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDTO } from './dto/send-email-dto';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post()
  @HttpCode(202)
  sendEmail(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: SendEmailDTO,
  ) {
    if (!apiKey) {
      throw new BadRequestException('X-API-Key header is required');
    }
    return this.emailService.send(apiKey, dto);
  }
}
