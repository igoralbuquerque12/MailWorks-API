import { Injectable, NotFoundException } from '@nestjs/common';
import { EmailTemplate } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTemplateDTO } from './dto/create-template.dto';
import { UpdateTemplateDTO } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates a tenant-owned reusable email template. */
  create(tenantId: string, dto: CreateTemplateDTO): Promise<EmailTemplate> {
    return this.prisma.emailTemplate.create({ data: { tenantId, ...dto } });
  }

  /** Lists templates belonging to one tenant. */
  findAll(tenantId: string): Promise<EmailTemplate[]> {
    return this.prisma.emailTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Returns an active or inactive template within a tenant boundary. */
  async findOne(tenantId: string, id: string): Promise<EmailTemplate> {
    const template = await this.prisma.emailTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  /** Updates a tenant-owned template. */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateTemplateDTO,
  ): Promise<EmailTemplate> {
    await this.findOne(tenantId, id);
    return this.prisma.emailTemplate.update({ where: { id }, data: dto });
  }

  /** Permanently removes a tenant-owned template. */
  async remove(tenantId: string, id: string): Promise<EmailTemplate> {
    await this.findOne(tenantId, id);
    return this.prisma.emailTemplate.delete({ where: { id } });
  }
}
