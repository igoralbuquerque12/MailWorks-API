import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private redis: Redis;

  constructor() {
    const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;
    this.redis = new Redis({ host: process.env.REDIS_HOST, port: redisPort });
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
