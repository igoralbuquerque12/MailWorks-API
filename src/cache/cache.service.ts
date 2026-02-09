import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({ host: 'localhost', port: 6379 });
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
