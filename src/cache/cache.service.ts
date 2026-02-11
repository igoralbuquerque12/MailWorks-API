import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheService {
  private redis: Redis;

  constructor(private configService: ConfigService) {
    const redisHost =
      this.configService.get<string>('REDIS_HOST') || 'localhost';
    const redisPort = this.configService.get<number>('REDIS_PORT') || 6379;

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
    });
  }

  set(key: string, value: string, ttlSeconds = 1800): Promise<'OK'> {
    return this.redis.set(key, value, 'EX', ttlSeconds);
  }

  get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  delete(key: string): Promise<number> {
    return this.redis.del(key);
  }
}
