import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from 'src/cache/cache.service';
import { EmailService } from 'src/email/email.service';
import { VerifyTwoFactorDTO, SendTwoFactorDTO } from './dto';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly emailService: EmailService,
  ) {}

  async send(twoFactorData: SendTwoFactorDTO): Promise<void> {
    try {
      const { email } = twoFactorData;

      const code = '123456';
      const cacheKey = 'autentication:' + email;

      await this.cacheService.set(cacheKey, code, 1800);

      await this.emailService.send({
        to: email,
        subject: 'Seu código de verificação',
        content: `Seu código é: ${code}`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`Erro: ${errorMessage}`);
      throw error;
    }
  }

  async verify(twoFactorData: VerifyTwoFactorDTO): Promise<boolean> {
    const { email, code } = twoFactorData;

    const cacheKey = 'autentication:' + email;
    const savedCode = await this.cacheService.get(cacheKey);

    return savedCode === code;
  }
}
