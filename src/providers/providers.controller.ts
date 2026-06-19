import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from 'src/common/auth/api-key.guard';
import { Auth } from 'src/common/auth/auth-context.decorator';
import { AuthContext } from 'src/common/auth/auth-context.interface';
import { CreateEmailProviderDTO } from './dto/create-email-provider.dto';
import { ProvidersService } from './providers.service';

@UseGuards(ApiKeyGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  create(@Auth() auth: AuthContext, @Body() dto: CreateEmailProviderDTO) {
    return this.providersService.create(auth.tenantId, dto);
  }

  @Get()
  findAll(@Auth() auth: AuthContext) {
    return this.providersService.findAll(auth.tenantId);
  }

  @Patch(':id/activate')
  activate(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.providersService.setActive(auth.tenantId, id, true);
  }

  @Patch(':id/deactivate')
  deactivate(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.providersService.setActive(auth.tenantId, id, false);
  }
}
