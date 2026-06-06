import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from 'src/common/auth/api-key.guard';
import { Auth } from 'src/common/auth/auth-context.decorator';
import { AuthContext } from 'src/common/auth/auth-context.interface';
import { SendTwoFactorDTO, VerifyTwoFactorDTO } from './dto';
import { TwoFactorService } from './two-factor.service';

@UseGuards(ApiKeyGuard)
@Controller('two-factor')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Post('send')
  @HttpCode(202)
  send(@Auth() auth: AuthContext, @Body() dto: SendTwoFactorDTO) {
    return this.twoFactorService.send(auth, dto);
  }

  @Post('verify')
  @HttpCode(200)
  verify(@Auth() auth: AuthContext, @Body() dto: VerifyTwoFactorDTO) {
    return this.twoFactorService.verify(auth, dto);
  }
}
