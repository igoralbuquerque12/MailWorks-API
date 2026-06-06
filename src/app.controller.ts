import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class AppController {
  /** Returns a lightweight liveness response without external dependencies. */
  @Get()
  healthCheck() {
    return {
      status: 'ok',
      service: 'mailworks-api',
      timestamp: new Date().toISOString(),
    };
  }
}
