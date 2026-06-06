import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from 'src/common/auth/api-key.guard';
import { Auth } from 'src/common/auth/auth-context.decorator';
import { AuthContext } from 'src/common/auth/auth-context.interface';
import { EmailJobsService } from './email-jobs.service';

@UseGuards(ApiKeyGuard)
@Controller('email-jobs')
export class EmailJobsController {
  constructor(private readonly emailJobsService: EmailJobsService) {}

  /** Returns one job without allowing cross-tenant lookup. */
  @Get(':id')
  async findOne(@Auth() auth: AuthContext, @Param('id') id: string) {
    const job = await this.emailJobsService.findForTenant(id, auth.tenantId);
    if (!job) {
      throw new NotFoundException('Email job not found');
    }
    return job;
  }
}
