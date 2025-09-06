import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private redis: Redis;
  private readonly logger = new Logger(CacheService.name);

  constructor() {
    this.redis = new Redis({ host: 'localhost', port: 6379 });
  }

  set(key: string, value: string, ttlSeconds = 1800): Promise<'OK'> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return this.redis.set(key, value, 'EX', ttlSeconds);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao gerar cache: ', errorMessage);
      throw error;
    }
  }

  get(key: string): Promise<string | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return this.redis.get(key);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao buscar cache: ', errorMessage);
      throw error;
    }
  }

  delete(key: string): Promise<number> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      return this.redis.del(key);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error('Erro ao deletar cache: ', errorMessage);
      throw error;
    }
  }
}
