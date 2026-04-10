import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { CacheService } from 'src/cache/cache.service';
import { EmailService } from 'src/email/email.service';
import { VerifyTwoFactorDTO, SendTwoFactorDTO } from './dto';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async send(twoFactorData: SendTwoFactorDTO): Promise<void> {
    const { email } = twoFactorData;

    const code = crypto.randomInt(100000, 999999).toString();
    const cacheKey = `2fa:${email}`;

    await this.cacheService.set(cacheKey, code, 1800);

    const apiKey = this.configService.get<string>('DEFAULT_API_KEY');
    if (!apiKey) throw new Error('DEFAULT_API_KEY não configurada no .env');

    await this.emailService.send(apiKey, {
      to: email,
      subject: 'Seu código de verificação',
      content: `Seu código é: ${code}`,
    });
  }

  async verify(twoFactorData: VerifyTwoFactorDTO): Promise<boolean> {
    const { email, code } = twoFactorData;

    const cacheKey = `2fa:${email}`;
    const savedCode = await this.cacheService.get(cacheKey);

    if (savedCode === code) {
      await this.cacheService.delete(cacheKey);
      return true;
    }

    return false;
  }
}
