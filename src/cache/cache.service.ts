import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({ host: 'localhost', port: 6379 });
  }

  set(key: string, value: string, ttlSeconds = 1800): Promise<'OK'> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.redis.set(key, value, 'EX', ttlSeconds);
  }

  get(key: string): Promise<string | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.redis.get(key);
  }

  delete(key: string): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.redis.del(key);
  }
}
