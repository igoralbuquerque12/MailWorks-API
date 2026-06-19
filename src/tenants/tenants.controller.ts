import { Controller, Post } from '@nestjs/common';
import { TenantsService } from './tenants.service';

@Controller('dev')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /** Creates development-only demo resources. */
  @Post('bootstrap')
  bootstrapDev() {
    return this.tenantsService.bootstrapDev();
  }
}
