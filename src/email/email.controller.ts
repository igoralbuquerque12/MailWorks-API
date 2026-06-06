import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from 'src/common/auth/api-key.guard';
import { Auth } from 'src/common/auth/auth-context.decorator';
import { AuthContext } from 'src/common/auth/auth-context.interface';
import { SendBulkEmailDTO } from './dto/send-bulk-email.dto';
import { SendEmailDTO } from './dto/send-email.dto';
import { SendTemplateEmailDTO } from './dto/send-template-email.dto';
import { EmailService } from './email.service';

@UseGuards(ApiKeyGuard)
@Controller('emails')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @HttpCode(202)
  send(@Auth() auth: AuthContext, @Body() dto: SendEmailDTO) {
    return this.emailService.send(auth, dto);
  }

  @Post('send-template')
  @HttpCode(202)
  sendTemplate(@Auth() auth: AuthContext, @Body() dto: SendTemplateEmailDTO) {
    return this.emailService.sendTemplate(auth, dto);
  }

  @Post('bulk')
  @HttpCode(202)
  sendBulk(@Auth() auth: AuthContext, @Body() dto: SendBulkEmailDTO) {
    return this.emailService.sendBulk(auth, dto);
  }
}
