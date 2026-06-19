import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt, timingSafeEqual } from 'crypto';
import { AuthContext } from 'src/common/auth/auth-context.interface';
import { hashApiKey } from 'src/common/utils/api-key.util';
import { EmailService } from 'src/email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SendTwoFactorDTO, VerifyTwoFactorDTO } from './dto';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /** Persists a hashed challenge and queues its email through the standard flow. */
  async send(auth: AuthContext, dto: SendTwoFactorDTO) {
    const code = randomInt(100000, 1000000).toString();
    const ttlSeconds = this.configService.get<number>(
      'TWO_FACTOR_TTL_SECONDS',
      1800,
    );
    const challenge = await this.prisma.twoFactorChallenge.create({
      data: {
        tenantId: auth.tenantId,
        email: dto.email,
        codeHash: hashApiKey(code),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });
    const queued = await this.emailService.send(auth, {
      to: dto.email,
      subject: 'Seu codigo de verificacao',
      content: `<p>Seu codigo e: <strong>${code}</strong></p>`,
    });

    this.logger.log(
      JSON.stringify({
        event: 'two_factor_challenge_created',
        tenantId: auth.tenantId,
        challengeId: challenge.id,
        jobId: queued.jobId,
      }),
    );

    return { challengeId: challenge.id, jobId: queued.jobId, queued: true };
  }

  /** Validates a non-expired, single-use challenge for one tenant and email. */
  async verify(auth: AuthContext, dto: VerifyTwoFactorDTO) {
    const challenge = await this.prisma.twoFactorChallenge.findFirst({
      where: {
        tenantId: auth.tenantId,
        email: dto.email,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge || challenge.expiresAt <= new Date()) {
      return { valid: false };
    }

    const expected = Buffer.from(challenge.codeHash);
    const received = Buffer.from(hashApiKey(dto.code));
    const valid =
      expected.length === received.length &&
      timingSafeEqual(expected, received);

    if (!valid) return { valid: false };

    await this.prisma.twoFactorChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    this.logger.log(
      JSON.stringify({
        event: 'two_factor_verified',
        tenantId: auth.tenantId,
        challengeId: challenge.id,
      }),
    );
    return { valid: true };
  }
}
