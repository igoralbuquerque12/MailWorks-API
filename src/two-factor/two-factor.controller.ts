import { Controller, Body, Post, Logger, HttpCode } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { SendTwoFactorDTO, VerifyTwoFactorDTO } from './dto';

@Controller('two-factor')
export class TwoFactorController {
  private readonly logger = new Logger(TwoFactorController.name);

  constructor(private twoFactorService: TwoFactorService) {}

  @Post('send')
  @HttpCode(200)
  send(@Body() body: SendTwoFactorDTO): string {
    this.twoFactorService.send(body).catch((error) => {
      this.logger.error('Error with send two factor validation: ', error);
    });
    return 'Your two factor autentitcation has been sent!';
  }

  @Post('verify')
  @HttpCode(200)
  async verify(@Body() body: VerifyTwoFactorDTO): Promise<boolean> {
    const verificationCode = await this.twoFactorService
      .verify(body)
      .catch((error) => {
        this.logger.error(
          'Error with verification two factor service: ',
          error,
        );
        return false;
      });

    return verificationCode;
  }
}
