import { Controller, Body, Post, HttpCode } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { SendTwoFactorDTO, VerifyTwoFactorDTO } from './dto';

@Controller('two-factor')
export class TwoFactorController {
  constructor(private twoFactorService: TwoFactorService) {}

  @Post('send')
  @HttpCode(200)
  send(@Body() body: SendTwoFactorDTO) {
    return this.twoFactorService.send(body);
  }

  @Post('verify')
  @HttpCode(200)
  async verify(@Body() body: VerifyTwoFactorDTO) {
    return this.twoFactorService.verify(body);
  }
}
