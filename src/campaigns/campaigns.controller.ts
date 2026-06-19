import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from 'src/common/auth/api-key.guard';
import { Auth } from 'src/common/auth/auth-context.decorator';
import { AuthContext } from 'src/common/auth/auth-context.interface';
import { CampaignsService } from './campaigns.service';

@UseGuards(ApiKeyGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  /** Returns one campaign summary scoped to the authenticated tenant. */
  @Get(':id')
  findOne(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.campaignsService.findForTenant(id, auth.tenantId);
  }
}
