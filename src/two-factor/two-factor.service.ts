import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { EmailService } from 'src/email/email.service';
import { VerifyTwoFactorDTO, SendTwoFactorDTO } from './dto';
import { CodeGeneratorHelper } from 'src/two-factor/helpers/code-generator.helper';
import {
  TWO_FACTOR_CODE_LENGTH,
  TWO_FACTOR_CODE_TTL_SECONDS,
} from 'src/two-factor/constants/two-factor.constants';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly emailService: EmailService,
    private readonly codeGeneratorHelper: CodeGeneratorHelper,
  ) {}

  async send(twoFactorData: SendTwoFactorDTO): Promise<{ message: string }> {
    const { email } = twoFactorData;
    const code = this.codeGeneratorHelper.generateNumericCode(
      TWO_FACTOR_CODE_LENGTH,
    );
    const cacheKey = `authentication:${email}`;

    try {
      await this.cacheService.set(cacheKey, code, TWO_FACTOR_CODE_TTL_SECONDS);

      await this.emailService.send({
        to: email,
        subject: 'Seu código de verificação',
        content: `Seu código é: ${code}`,
      });

      return { message: 'Your two factor authentication has been sent!' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending 2FA to ${email}`, message);

      throw new InternalServerErrorException(
        'Failed to send two-factor authentication code. Please try again later.',
      );
    }
  }

  private async _getEmailCode(email: string): Promise<string | null> {
    const cacheKey = `authentication:${email}`;
    return this.cacheService.get(cacheKey);
  }

  async verify(twoFactorData: VerifyTwoFactorDTO): Promise<boolean> {
    const { email, code } = twoFactorData;
    const savedCode = await this._getEmailCode(email);

    if (savedCode === code) {
      await this.cacheService.delete(`authentication:${email}`);
      return true;
    }

    return false;
  }
}
