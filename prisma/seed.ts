import { PrismaClient, ProviderType } from '@prisma/client';
import {
  generateApiKey,
  getApiKeyPrefix,
  hashApiKey,
} from '../src/common/utils/api-key.util';

const prisma = new PrismaClient();
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEV_PROVIDER_ID = '00000000-0000-0000-0000-000000000002';
const DEV_API_KEY_ID = '00000000-0000-0000-0000-000000000003';

async function main() {
  const rawApiKey = generateApiKey('mw_dev');
  const providerType =
    process.env.DEV_PROVIDER_TYPE === 'SMTP'
      ? ProviderType.SMTP
      : ProviderType.SES;
  const config =
    providerType === ProviderType.SMTP
      ? {
          host: process.env.SMTP_HOST || 'smtp.example.com',
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === 'true',
          user: process.env.SMTP_USER || 'user@example.com',
          pass: process.env.SMTP_PASS || 'app-password',
          fromName: process.env.AWS_SES_FROM_NAME || 'MailWorks Dev',
        }
      : {
          region: process.env.AWS_REGION || 'us-east-1',
          fromEmail:
            process.env.AWS_SES_FROM_EMAIL || 'verified@example.com',
          fromName: process.env.AWS_SES_FROM_NAME || 'MailWorks Dev',
        };

  await prisma.tenant.upsert({
    where: { id: DEV_TENANT_ID },
    update: { name: process.env.DEV_TENANT_NAME || 'Dev Tenant' },
    create: {
      id: DEV_TENANT_ID,
      name: process.env.DEV_TENANT_NAME || 'Dev Tenant',
    },
  });
  await prisma.tenantEmailProvider.upsert({
    where: { id: DEV_PROVIDER_ID },
    update: { providerType, config },
    create: {
      id: DEV_PROVIDER_ID,
      tenantId: DEV_TENANT_ID,
      providerType,
      config,
    },
  });
  await prisma.tenantApiKey.upsert({
    where: { id: DEV_API_KEY_ID },
    update: {
      keyPrefix: getApiKeyPrefix(rawApiKey),
      keyHash: hashApiKey(rawApiKey),
      revokedAt: null,
      isActive: true,
    },
    create: {
      id: DEV_API_KEY_ID,
      tenantId: DEV_TENANT_ID,
      providerId: DEV_PROVIDER_ID,
      name: process.env.DEV_API_KEY_NAME || 'Local Dev Key',
      keyPrefix: getApiKeyPrefix(rawApiKey),
      keyHash: hashApiKey(rawApiKey),
    },
  });
  await prisma.emailTemplate.upsert({
    where: {
      tenantId_name: { tenantId: DEV_TENANT_ID, name: 'welcome' },
    },
    update: {},
    create: {
      tenantId: DEV_TENANT_ID,
      name: 'welcome',
      subject: 'Bem-vindo, {{name}}',
      html: '<p>Ola {{name}}, bem-vindo ao MailWorks.</p>',
    },
  });

  console.log('Seed concluido.');
  console.log(`Tenant ID: ${DEV_TENANT_ID}`);
  console.log(`Provider ID: ${DEV_PROVIDER_ID}`);
  console.log(`API Key: ${rawApiKey}`);
  console.log('Use a API key acima no header x-api-key.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
