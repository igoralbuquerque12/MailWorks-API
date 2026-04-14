import {
  Controller,
  Body,
  Post,
  HttpCode,
  Headers,
  UseGuards,
} from '@nestjs/common';

import { EmailService } from 'src/email/email.service';
import { SendEmailDTO } from 'src/email/dto/send-email-dto';
import { ApiKeyGuard } from 'src/guards/api-key.guard';

@UseGuards(ApiKeyGuard)
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) { }

  @Post()
  @HttpCode(202)
  send(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: SendEmailDTO,
  ) {
    return this.emailService.send(apiKey, dto);
  }
}
