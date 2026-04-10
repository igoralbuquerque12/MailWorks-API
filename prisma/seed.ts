import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// IDs fixos para garantir idempotência do seed em dev
const DEV_TENANT_ID   = '00000000-0000-0000-0000-000000000001';
const DEV_PROVIDER_ID = '00000000-0000-0000-0000-000000000002';
const DEV_API_KEY_ID  = '00000000-0000-0000-0000-000000000003';
const DEV_API_KEY     = 'dev-api-key-insecure';

async function main() {
  const smtpHost = process.env.SMTP_HOST || 'smtp.example.com';
  const smtpUser = process.env.SMTP_USER || 'user@example.com';
  const smtpPass = process.env.SMTP_PASS || 'placeholder-password';

  // 1. Tenant de desenvolvimento
  await prisma.tenant.upsert({
    where:  { id: DEV_TENANT_ID },
    update: {},
    create: {
      id:       DEV_TENANT_ID,
      name:     'Dev Tenant',
      isActive: true,
    },
  });

  // 2. Provedor SMTP vinculado ao tenant
  await prisma.tenantEmailProvider.upsert({
    where:  { id: DEV_PROVIDER_ID },
    update: {},
    create: {
      id:           DEV_PROVIDER_ID,
      tenantId:     DEV_TENANT_ID,
      providerType: 'SMTP',
      isActive:     true,
      config: {
        host:     smtpHost,
        port:     587,
        secure:   false,
        user:     smtpUser,
        pass:     smtpPass,
        fromName: 'MailWorks Dev',
      },
    },
  });

  // 3. API Key vinculada ao tenant + provider
  await prisma.tenantApiKey.upsert({
    where:  { apiKey: DEV_API_KEY },
    update: {},
    create: {
      id:         DEV_API_KEY_ID,
      apiKey:     DEV_API_KEY,
      tenantId:   DEV_TENANT_ID,
      providerId: DEV_PROVIDER_ID,
      isActive:   true,
    },
  });

  console.log('Seed concluído com sucesso!');
  console.log('');
  console.log('Adicione ao seu .env:');
  console.log(`DEFAULT_API_KEY=${DEV_API_KEY}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
