import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EMAIL_QUEUE } from './queue.constants';
import { EmailProcessor } from './email.processor';
import { ProvidersModule } from 'src/providers/providers.module';
import { EmailJobModule } from 'src/email-job/email-job.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
    ProvidersModule,
    EmailJobModule,
  ],
  providers: [EmailProcessor],
  exports:   [BullModule],
})
export class QueueModule {}
