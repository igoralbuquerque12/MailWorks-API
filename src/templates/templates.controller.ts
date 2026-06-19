import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from 'src/common/auth/api-key.guard';
import { Auth } from 'src/common/auth/auth-context.decorator';
import { AuthContext } from 'src/common/auth/auth-context.interface';
import { CreateTemplateDTO } from './dto/create-template.dto';
import { UpdateTemplateDTO } from './dto/update-template.dto';
import { TemplatesService } from './templates.service';

@UseGuards(ApiKeyGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  create(@Auth() auth: AuthContext, @Body() dto: CreateTemplateDTO) {
    return this.templatesService.create(auth.tenantId, dto);
  }

  @Get()
  findAll(@Auth() auth: AuthContext) {
    return this.templatesService.findAll(auth.tenantId);
  }

  @Get(':id')
  findOne(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.templatesService.findOne(auth.tenantId, id);
  }

  @Patch(':id')
  update(
    @Auth() auth: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDTO,
  ) {
    return this.templatesService.update(auth.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Auth() auth: AuthContext, @Param('id') id: string) {
    return this.templatesService.remove(auth.tenantId, id);
  }
}
