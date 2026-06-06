# SPEC DRIVEN — Refactor MailWorks API para AWS Event-Driven Architecture

> Objetivo: transformar a MailWorks API em uma plataforma de envio de e-mails multi-tenant, assíncrona, resiliente e observável usando AWS SQS, DLQ, Lambda, SES, CloudWatch e Serverless Framework.

---

## 0. Contexto e intenção da spec

Este repositório já possui uma base NestJS com Prisma, envio SMTP via Nodemailer, fila Bull/Redis, `EmailJob`, `TenantEmailProvider`, `TenantApiKey`, `TwoFactorService`, `EmailProviderFactory` e um fluxo inicial assíncrono.

A partir desta spec, a IA de código assistido deve fazer um refactor agressivo e profissional para transformar o projeto em um case forte de arquitetura cloud para entrevista técnica. O objetivo não é apenas “usar AWS”, mas demonstrar domínio de:

- arquitetura orientada a eventos;
- desacoplamento entre API e processamento;
- filas gerenciadas;
- retry e Dead Letter Queue;
- processamento assíncrono com Lambda;
- provider de e-mail via Amazon SES;
- multi-tenancy por API key;
- observabilidade via CloudWatch;
- idempotência e consistência operacional;
- documentação técnica clara para outro dev aprender AWS usando o projeto.

---

## 1. Resultado final esperado

Ao fim da implementação, o projeto deve se chamar conceitualmente:

**MailWorks — AWS Event-Driven Email Delivery API**

A arquitetura final desejada:

```txt
Client / Tenant
  ↓ HTTP
API Gateway / Lambda HTTP API
  ↓
NestJS API
  ↓ valida API key + tenant + provider
PostgreSQL via Prisma
  ↓ cria EmailJob / EmailCampaign
Amazon SQS main queue
  ↓ event source mapping
AWS Lambda email worker
  ↓ resolve provider
Amazon SES ou SMTP
  ↓ atualiza status
PostgreSQL

Falhas repetidas:
SQS main queue → DLQ → CloudWatch Alarm
```

A API nunca deve enviar e-mail dentro do ciclo HTTP de request/response. Todo envio real deve ser assíncrono.

---

## 2. Serviços AWS obrigatórios

Implementar e documentar os seguintes serviços:

1. **Amazon SQS**
   - fila principal de jobs de e-mail;
   - recebe mensagens `{ jobId }`;
   - desacopla a API do worker.

2. **Amazon SQS DLQ**
   - Dead Letter Queue para jobs que falharam após número máximo de tentativas;
   - configurada via `RedrivePolicy` no `serverless.yml`.

3. **AWS Lambda**
   - uma Lambda para a API NestJS via HTTP API;
   - uma Lambda worker consumindo SQS;
   - worker com partial batch response para falhar individualmente só as mensagens problemáticas.

4. **Amazon SES**
   - provider real de envio de e-mail;
   - implementado como adapter `SesProvider` compatível com `IEmailProvider`.

5. **Amazon CloudWatch**
   - logs automáticos das Lambdas;
   - alarmes para DLQ com mensagens;
   - métricas operacionais descritas na documentação.

6. **Serverless Framework**
   - `serverless.yml` deve criar filas, DLQ, Lambdas, HTTP API, alarmes e permissões IAM mínimas.

---

## 3. Decisões arquiteturais obrigatórias

### 3.1. Remover Bull/Redis do fluxo de e-mails

Remover completamente Bull e Redis como fila de e-mail.

Remover do projeto:

- `@nestjs/bull`;
- `bull`;
- `@types/bull`;
- `src/queue/email.processor.ts`;
- `src/queue/queue.module.ts`;
- `src/queue/queue.constants.ts`, se não houver uso;
- qualquer `InjectQueue`;
- qualquer referência a BullModule.

A fila oficial de produção deve ser SQS.

### 3.2. Remover Redis também do 2FA

Como o objetivo é virar um case AWS/cloud, não manter Redis apenas para 2FA.

Substituir o armazenamento do código 2FA por PostgreSQL via Prisma, com uma tabela `TwoFactorChallenge`.

Motivo: reduzir dependência local, simplificar deploy serverless e manter persistência auditável.

### 3.3. Manter Prisma/PostgreSQL

Não migrar tudo para DynamoDB nesta versão.

Motivo:

- o repositório já usa Prisma;
- Postgres é excelente para multi-tenancy relacional;
- templates, providers, API keys, campaigns e jobs têm relações claras;
- evita complexidade excessiva de modelagem NoSQL em 2 dias;
- ainda assim o projeto terá AWS forte por SQS, DLQ, Lambda, SES, CloudWatch e Serverless.

### 3.4. Criar ports/adapters para fila

Não deixar `EmailService` conhecer diretamente AWS SDK.

Criar uma abstração:

```ts
export interface EmailQueuePublisher {
  publishEmailJob(input: PublishEmailJobInput): Promise<void>;
}
```

Implementação principal:

```ts
SqsEmailQueuePublisher
```

Isso permite explicar na entrevista que a camada de aplicação depende de uma porta, e AWS SQS é apenas um adapter de infraestrutura.

### 3.5. Worker idempotente

SQS tem semântica de entrega pelo menos uma vez. Portanto, o worker deve ser idempotente.

Regras:

- Se `EmailJob.status === SENT`, o worker deve logar e ignorar.
- Se o job não existir, o worker deve tratar como erro de dado e falhar a mensagem.
- Antes de enviar, marcar como `PROCESSING` e incrementar `attempts`.
- Em caso de sucesso, marcar como `SENT`.
- Em caso de erro, marcar como `FAILED` ou `FAILED_FINAL`, registrar `errorMessage`, e retornar falha parcial para o SQS tentar novamente.
- Usar `ApproximateReceiveCount` do evento SQS para decidir se está perto do limite final.

---

## 4. Branch, commits, PR e entrega final

A IA deve criar uma branch nova:

```bash
git checkout -b feat/aws-event-driven-mailworks
```

Ao final:

1. Rodar lint/build/test.
2. Commitar todas as alterações.
3. Abrir Pull Request em português brasileiro.
4. O PR deve explicar:
   - o que foi removido;
   - o que foi adicionado;
   - como ficou a arquitetura AWS;
   - como testar localmente;
   - como fazer deploy;
   - limitações conhecidas.
5. Criar `EXIT.md` dentro da pasta da spec executada.

Criar pasta de execução:

```txt
ai/specs/2026-06-06-mailworks-aws-event-driven/
  SPEC.md
  EXIT.md
```

Copiar esta spec para `SPEC.md` antes de começar a implementar.

O `EXIT.md` deve conter:

- o que a IA entendeu;
- plano seguido;
- alterações por área, nesta ordem quando aplicável:
  - infra;
  - banco de dados;
  - server/API;
  - worker;
  - providers;
  - docs;
  - testes;
- decisões técnicas tomadas;
- o que não foi concluído;
- se a documentação foi atualizada;
- comandos executados;
- resultado de build/test/lint.

---

## 5. Diagnóstico do código atual

A IA deve revisar o código atual e corrigir os seguintes problemas esperados:

### 5.1. Prisma schema desalinhado

O model `TenantApiKey` está inconsistente.

Problemas a corrigir:

- o seed usa `apiKey`, mas o schema usa `key`;
- o schema referencia `tenantId` dentro da relação com provider, mas o campo `tenantId` não aparece claramente definido no model;
- `Tenant` possui `apiKeys`, mas `TenantApiKey` precisa ter relação explícita com `Tenant`;
- `findUnique` atual usa filtros que não são unique compostos válidos;
- API key está salva em texto puro.

### 5.2. Guard inseguro

`ApiKeyGuard` apenas verifica se o header existe.

Deve ser reimplementado para:

- ler `x-api-key`;
- hashear a key recebida;
- buscar `TenantApiKey` ativa;
- validar tenant ativo;
- validar provider ativo;
- anexar contexto no request:

```ts
request.auth = {
  tenantId,
  apiKeyId,
  providerId,
  providerType,
};
```

### 5.3. Bull/Redis deve sair do fluxo

Hoje o `EmailService` cria o job e chama `emailQueue.add`. Isso deve ser substituído por `SqsEmailQueuePublisher.publishEmailJob`.

### 5.4. Provider enum incompleto

O Prisma possui `SES`, mas o enum TypeScript está parcialmente comentado.

Corrigir para suportar:

```ts
SMTP
SES
```

Manter `MAILGUN` e `RESEND` como planejados, mas não obrigatórios neste refactor.

### 5.5. README boilerplate

O README atual ainda é o boilerplate do NestJS. Deve ser substituído por documentação real do projeto.

---

## 6. Estrutura final desejada de diretórios

Reorganizar para algo próximo disso:

```txt
src/
  app.module.ts
  main.ts

  common/
    auth/
      api-key.guard.ts
      auth-context.decorator.ts
      auth-context.interface.ts
    enums/
      provider-type.enum.ts
      job-status.enum.ts
      campaign-status.enum.ts
    interfaces/
      email-provider.interface.ts
    utils/
      api-key.util.ts
      template-renderer.util.ts

  prisma/
    prisma.module.ts
    prisma.service.ts

  tenants/
    tenants.module.ts
    tenants.service.ts
    tenants.controller.ts
    dto/
      create-tenant.dto.ts

  providers/
    providers.module.ts
    email-provider.factory.ts
    providers.controller.ts
    providers.service.ts
    dto/
      create-email-provider.dto.ts
    smtp/
      smtp.provider.ts
      smtp-config.interface.ts
    ses/
      ses.provider.ts
      ses-config.interface.ts

  templates/
    templates.module.ts
    templates.controller.ts
    templates.service.ts
    dto/
      create-template.dto.ts
      update-template.dto.ts

  email/
    email.module.ts
    email.controller.ts
    email.service.ts
    dto/
      send-email.dto.ts
      send-bulk-email.dto.ts
      send-template-email.dto.ts

  email-jobs/
    email-jobs.module.ts
    email-jobs.service.ts
    email-jobs.controller.ts

  campaigns/
    campaigns.module.ts
    campaigns.service.ts
    campaigns.controller.ts

  two-factor/
    two-factor.module.ts
    two-factor.controller.ts
    two-factor.service.ts
    dto/
      send-two-factor.dto.ts
      verify-two-factor.dto.ts

  aws/
    aws.module.ts
    sqs-email-queue.publisher.ts
    email-queue.publisher.interface.ts
    sqs-message.types.ts

  workers/
    workers.module.ts
    email-worker.service.ts

  lambda/
    api.handler.ts
    email-worker.handler.ts
```

---

## 7. Dependências

### 7.1. Remover

Remover do `package.json`:

```json
{
  "@nestjs/bull": "...",
  "bull": "...",
  "@types/bull": "...",
  "ioredis": "..."
}
```

Se `ioredis` ficar sem uso após remover 2FA Redis, remover também.

### 7.2. Adicionar

Adicionar:

```bash
npm install @aws-sdk/client-sqs @aws-sdk/client-ses @codegenie/serverless-express serverless-http
npm install zod
npm install uuid
npm install --save-dev serverless serverless-esbuild serverless-offline serverless-dotenv-plugin @types/aws-lambda
```

Observação: usar `@codegenie/serverless-express` ou `serverless-http`, escolher uma opção e remover a outra se não for usada. Preferência: `@codegenie/serverless-express` para adaptar Nest/Express em Lambda.

---

## 8. Variáveis de ambiente

Atualizar `.env.example` com:

```env
# App
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL="postgresql://mailworks:mailworks@localhost:5432/mailworks?schema=public"

# AWS
AWS_REGION=us-east-1
AWS_PROFILE=default
AWS_SQS_EMAIL_QUEUE_URL=
AWS_SES_FROM_EMAIL=verified@example.com
AWS_SES_FROM_NAME=MailWorks

# Email processing
EMAIL_WORKER_MAX_RECEIVE_COUNT=5
EMAIL_QUEUE_MESSAGE_GROUP_ID=

# 2FA
TWO_FACTOR_TTL_SECONDS=1800

# Dev bootstrap
DEV_TENANT_NAME=Dev Tenant
DEV_PROVIDER_TYPE=SES
DEV_API_KEY_NAME=Local Dev Key
```

Não commitar `.env` real.

---

## 9. Prisma schema final

Atualizar `prisma/schema.prisma`.

Schema sugerido:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ProviderType {
  SMTP
  SES
  MAILGUN
  RESEND
}

enum JobStatus {
  PENDING
  PROCESSING
  SENT
  FAILED
  FAILED_FINAL
}

enum CampaignStatus {
  PENDING
  PROCESSING
  COMPLETED
  COMPLETED_WITH_FAILURES
  FAILED
}

model Tenant {
  id             String                @id @default(uuid())
  name           String
  isActive       Boolean               @default(true) @map("is_active")
  createdAt      DateTime              @default(now()) @map("created_at")
  updatedAt      DateTime              @updatedAt @map("updated_at")

  emailProviders TenantEmailProvider[]
  apiKeys        TenantApiKey[]
  templates      EmailTemplate[]
  emailJobs      EmailJob[]
  campaigns      EmailCampaign[]
  twoFactorCodes TwoFactorChallenge[]

  @@map("tenants")
}

model TenantEmailProvider {
  id           String       @id @default(uuid())
  tenantId     String       @map("tenant_id")
  providerType ProviderType @map("provider_type")
  config       Json
  isActive     Boolean      @default(true) @map("is_active")
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")

  tenant       Tenant       @relation(fields: [tenantId], references: [id])
  apiKeys      TenantApiKey[]
  emailJobs    EmailJob[]

  @@index([tenantId])
  @@map("tenant_email_providers")
}

model TenantApiKey {
  id         String              @id @default(uuid())
  tenantId   String              @map("tenant_id")
  providerId String              @map("provider_id")
  name       String
  keyPrefix  String              @map("key_prefix")
  keyHash    String              @unique @map("key_hash")
  isActive   Boolean             @default(true) @map("is_active")
  createdAt  DateTime            @default(now()) @map("created_at")
  revokedAt  DateTime?           @map("revoked_at")

  tenant     Tenant              @relation(fields: [tenantId], references: [id])
  provider   TenantEmailProvider @relation(fields: [providerId], references: [id])

  @@index([tenantId])
  @@index([providerId])
  @@map("tenant_api_keys")
}

model EmailTemplate {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  name      String
  subject   String
  html      String
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  tenant    Tenant   @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, name])
  @@index([tenantId])
  @@map("email_templates")
}

model EmailCampaign {
  id              String         @id @default(uuid())
  tenantId        String         @map("tenant_id")
  name            String?
  subject         String
  totalRecipients Int            @map("total_recipients")
  status          CampaignStatus @default(PENDING)
  createdAt       DateTime       @default(now()) @map("created_at")
  completedAt     DateTime?      @map("completed_at")

  tenant          Tenant         @relation(fields: [tenantId], references: [id])
  jobs            EmailJob[]

  @@index([tenantId])
  @@map("email_campaigns")
}

model EmailJob {
  id           String              @id @default(uuid())
  tenantId     String              @map("tenant_id")
  providerId   String              @map("provider_id")
  campaignId   String?             @map("campaign_id")
  to           String
  subject      String
  content      String
  status       JobStatus           @default(PENDING)
  attempts     Int                 @default(0)
  errorMessage String?             @map("error_message")
  messageId    String?             @map("message_id")
  createdAt    DateTime            @default(now()) @map("created_at")
  processedAt  DateTime?           @map("processed_at")
  updatedAt    DateTime            @updatedAt @map("updated_at")

  tenant       Tenant              @relation(fields: [tenantId], references: [id])
  provider     TenantEmailProvider @relation(fields: [providerId], references: [id])
  campaign     EmailCampaign?      @relation(fields: [campaignId], references: [id])

  @@index([tenantId])
  @@index([providerId])
  @@index([campaignId])
  @@index([status])
  @@map("email_jobs")
}

model TwoFactorChallenge {
  id         String   @id @default(uuid())
  tenantId   String   @map("tenant_id")
  email      String
  codeHash   String   @map("code_hash")
  expiresAt  DateTime @map("expires_at")
  consumedAt DateTime? @map("consumed_at")
  createdAt  DateTime @default(now()) @map("created_at")

  tenant     Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId, email])
  @@index([expiresAt])
  @@map("two_factor_challenges")
}
```

Depois executar:

```bash
npx prisma format
npx prisma migrate dev --name aws_event_driven_refactor
npx prisma generate
```

---

## 10. API Key segura

Criar `src/common/utils/api-key.util.ts`.

Regras:

- API key raw só aparece na criação/bootstrap.
- Nunca armazenar API key em texto puro.
- Gerar key no formato:

```txt
mw_live_<random>
```

ou em dev:

```txt
mw_dev_<random>
```

- Armazenar:
  - `keyPrefix`: primeiros 12 ou 16 caracteres para debug;
  - `keyHash`: SHA-256 da key completa.

Exemplo:

```ts
import { createHash, randomBytes } from 'crypto';

export function generateApiKey(prefix = 'mw_dev'): string {
  return `${prefix}_${randomBytes(32).toString('hex')}`;
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.slice(0, 16);
}
```

---

## 11. AuthContext e Guard

Criar interface:

```ts
export interface AuthContext {
  tenantId: string;
  apiKeyId: string;
  providerId: string;
  providerType: ProviderType;
}
```

Criar decorator:

```ts
export const Auth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.auth;
  },
);
```

Reimplementar `ApiKeyGuard`:

- Validar header `x-api-key`.
- Hash da API key.
- Buscar `TenantApiKey` por `keyHash`.
- Incluir relações `tenant` e `provider`.
- Verificar `isActive` da key, tenant e provider.
- Anexar `request.auth`.
- Retornar `401` para chave inválida/inativa.

---

## 12. Provider SES

Criar:

```txt
src/providers/ses/ses-config.interface.ts
src/providers/ses/ses.provider.ts
```

Interface:

```ts
export interface SesConfig {
  region: string;
  fromEmail: string;
  fromName?: string;
}
```

Provider:

```ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { EmailPayload, IEmailProvider } from 'src/common/interfaces/email-provider.interface';
import { SesConfig } from './ses-config.interface';

export class SesProvider implements IEmailProvider {
  private readonly client: SESClient;

  constructor(private readonly config: SesConfig) {
    this.client = new SESClient({ region: config.region });
  }

  async send(payload: EmailPayload): Promise<{ messageId?: string }> {
    const fromName = this.config.fromName || 'MailWorks';
    const source = `${fromName} <${this.config.fromEmail}>`;

    const result = await this.client.send(
      new SendEmailCommand({
        Source: source,
        Destination: { ToAddresses: [payload.to] },
        Message: {
          Subject: { Data: payload.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: payload.content, Charset: 'UTF-8' },
          },
        },
      }),
    );

    return { messageId: result.MessageId };
  }
}
```

Ajustar `IEmailProvider` para retornar objeto opcional:

```ts
export interface EmailSendResult {
  messageId?: string;
}

export interface IEmailProvider {
  send(payload: EmailPayload): Promise<EmailSendResult>;
}
```

Atualizar `SmtpProvider` para retornar `{ messageId }` quando Nodemailer fornecer.

---

## 13. EmailProviderFactory

Atualizar factory para suportar SMTP e SES:

```ts
@Injectable()
export class EmailProviderFactory {
  create(providerConfig: TenantEmailProvider): IEmailProvider {
    switch (providerConfig.providerType as ProviderType) {
      case ProviderType.SMTP:
        return new SmtpProvider(providerConfig.config as unknown as SmtpConfig);

      case ProviderType.SES:
        return new SesProvider(providerConfig.config as unknown as SesConfig);

      default:
        throw new Error(`Provider ${providerConfig.providerType} not implemented`);
    }
  }
}
```

Adicionar validação mínima da config antes de instanciar:

- SMTP exige `host`, `port`, `user`, `pass`;
- SES exige `region`, `fromEmail`.

---

## 14. SQS publisher

Criar `src/aws/email-queue.publisher.interface.ts`:

```ts
export interface PublishEmailJobInput {
  jobId: string;
  tenantId: string;
  providerId: string;
  campaignId?: string | null;
  correlationId?: string;
}

export interface EmailQueuePublisher {
  publishEmailJob(input: PublishEmailJobInput): Promise<void>;
}
```

Criar `src/aws/sqs-email-queue.publisher.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { EmailQueuePublisher, PublishEmailJobInput } from './email-queue.publisher.interface';

@Injectable()
export class SqsEmailQueuePublisher implements EmailQueuePublisher {
  private readonly logger = new Logger(SqsEmailQueuePublisher.name);
  private readonly client: SQSClient;
  private readonly queueUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new SQSClient({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
    });

    this.queueUrl = this.configService.getOrThrow<string>('AWS_SQS_EMAIL_QUEUE_URL');
  }

  async publishEmailJob(input: PublishEmailJobInput): Promise<void> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify({
          jobId: input.jobId,
          tenantId: input.tenantId,
          providerId: input.providerId,
          campaignId: input.campaignId ?? null,
          correlationId: input.correlationId ?? input.jobId,
          eventType: 'EMAIL_JOB_CREATED',
          createdAt: new Date().toISOString(),
        }),
        MessageAttributes: {
          tenantId: { DataType: 'String', StringValue: input.tenantId },
          providerId: { DataType: 'String', StringValue: input.providerId },
          eventType: { DataType: 'String', StringValue: 'EMAIL_JOB_CREATED' },
        },
      }),
    );

    this.logger.log(
      JSON.stringify({
        event: 'email_job_published_to_sqs',
        jobId: input.jobId,
        tenantId: input.tenantId,
        providerId: input.providerId,
      }),
    );
  }
}
```

Criar `src/aws/aws.module.ts`:

```ts
@Module({
  providers: [
    SqsEmailQueuePublisher,
    {
      provide: 'EmailQueuePublisher',
      useExisting: SqsEmailQueuePublisher,
    },
  ],
  exports: ['EmailQueuePublisher', SqsEmailQueuePublisher],
})
export class AwsModule {}
```

---

## 15. EmailService

Refatorar para:

- receber `AuthContext` em vez de receber API key raw;
- criar `EmailJob`;
- publicar no SQS;
- retornar `202`.

Exemplo conceitual:

```ts
async send(auth: AuthContext, dto: SendEmailDTO) {
  const emailJob = await this.emailJobService.create({
    tenantId: auth.tenantId,
    providerId: auth.providerId,
    to: dto.to,
    subject: dto.subject,
    content: dto.content,
  });

  await this.emailQueuePublisher.publishEmailJob({
    jobId: emailJob.id,
    tenantId: auth.tenantId,
    providerId: auth.providerId,
  });

  return {
    jobId: emailJob.id,
    status: emailJob.status,
    queued: true,
  };
}
```

---

## 16. Endpoints finais

Padronizar rotas com prefixo `/v1`.

Em `main.ts`:

```ts
app.setGlobalPrefix('v1');
```

### 16.1. Health

```txt
GET /v1/health
```

Retorna:

```json
{
  "status": "ok",
  "service": "mailworks-api",
  "timestamp": "2026-06-06T00:00:00.000Z"
}
```

### 16.2. Tenants/dev bootstrap

Para facilitar demo, criar endpoint apenas em ambiente não produção:

```txt
POST /v1/dev/bootstrap
```

Cria:

- tenant dev;
- provider SES;
- API key;
- template exemplo.

Retorna API key raw uma única vez.

Bloquear se `NODE_ENV === 'production'`.

### 16.3. Providers

```txt
POST /v1/providers
GET /v1/providers
PATCH /v1/providers/:id/activate
PATCH /v1/providers/:id/deactivate
```

Protegidos por API key.

DTO SES:

```json
{
  "providerType": "SES",
  "config": {
    "region": "us-east-1",
    "fromEmail": "verified@example.com",
    "fromName": "MailWorks"
  }
}
```

DTO SMTP:

```json
{
  "providerType": "SMTP",
  "config": {
    "host": "smtp.example.com",
    "port": 587,
    "secure": false,
    "user": "user@example.com",
    "pass": "app-password",
    "fromName": "MailWorks"
  }
}
```

### 16.4. Templates

```txt
POST /v1/templates
GET /v1/templates
GET /v1/templates/:id
PATCH /v1/templates/:id
DELETE /v1/templates/:id
```

Template com variáveis simples:

```html
<p>Olá {{name}}, seu código é {{code}}</p>
```

Implementar renderer simples em `template-renderer.util.ts`.

Regras:

- substituir `{{key}}` por `variables[key]`;
- se variável não existir, deixar vazio ou lançar erro 400. Preferência: lançar 400 com lista de variáveis ausentes.

### 16.5. Email unitário

```txt
POST /v1/emails/send
```

Body:

```json
{
  "to": "customer@example.com",
  "subject": "Bem-vindo",
  "content": "<p>Olá!</p>"
}
```

Response:

```json
{
  "jobId": "uuid",
  "status": "PENDING",
  "queued": true
}
```

### 16.6. Email por template

```txt
POST /v1/emails/send-template
```

Body:

```json
{
  "to": "customer@example.com",
  "templateId": "uuid",
  "variables": {
    "name": "Igor",
    "code": "123456"
  }
}
```

### 16.7. Email em massa

```txt
POST /v1/emails/bulk
```

Body sem template:

```json
{
  "name": "June newsletter",
  "recipients": ["a@example.com", "b@example.com"],
  "subject": "Novidade",
  "content": "<p>Conteúdo</p>"
}
```

Body com template:

```json
{
  "name": "2FA batch",
  "templateId": "uuid",
  "recipients": [
    {
      "email": "a@example.com",
      "variables": { "name": "Ana" }
    },
    {
      "email": "b@example.com",
      "variables": { "name": "Bruno" }
    }
  ]
}
```

Regras:

- criar uma `EmailCampaign`;
- criar um `EmailJob` por destinatário;
- publicar cada job no SQS;
- retornar `campaignId`, total e status;
- validar limite máximo inicial de 1000 destinatários por request para demo;
- documentar que produção real deveria paginar/chunkar ou aceitar CSV via S3.

Response:

```json
{
  "campaignId": "uuid",
  "queued": 1000,
  "status": "PENDING"
}
```

### 16.8. Job status

```txt
GET /v1/email-jobs/:id
```

Retorna apenas jobs do tenant autenticado.

### 16.9. Campaign status

```txt
GET /v1/campaigns/:id
```

Retorna:

```json
{
  "campaignId": "uuid",
  "status": "PROCESSING",
  "totalRecipients": 100,
  "summary": {
    "pending": 10,
    "processing": 5,
    "sent": 80,
    "failed": 5
  }
}
```

### 16.10. 2FA

```txt
POST /v1/two-factor/send
POST /v1/two-factor/verify
```

2FA deve usar o mesmo fluxo de e-mail assíncrono.

`send`:

- gera código com `crypto.randomInt`;
- salva hash do código em `TwoFactorChallenge`;
- cria EmailJob;
- publica no SQS;
- retorna `queued: true`.

`verify`:

- busca challenge ativa por tenant + email;
- verifica expiração;
- compara hash;
- marca `consumedAt` em caso de sucesso;
- retorna `{ valid: true }` ou `{ valid: false }`.

Nunca salvar código 2FA em texto puro.

---

## 17. EmailWorkerService

Criar `src/workers/email-worker.service.ts`.

Responsabilidades:

- receber `jobId` e metadados da mensagem SQS;
- buscar `EmailJob`;
- idempotência;
- marcar processamento;
- buscar provider;
- enviar pelo factory;
- atualizar status;
- logar eventos estruturados.

Exemplo conceitual:

```ts
@Injectable()
export class EmailWorkerService {
  private readonly logger = new Logger(EmailWorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailJobService: EmailJobService,
    private readonly factory: EmailProviderFactory,
    private readonly configService: ConfigService,
  ) {}

  async processJob(input: {
    jobId: string;
    correlationId?: string;
    receiveCount?: number;
  }): Promise<void> {
    const emailJob = await this.emailJobService.findById(input.jobId);

    if (!emailJob) {
      throw new Error(`EmailJob ${input.jobId} not found`);
    }

    if (emailJob.status === 'SENT') {
      this.logger.log(JSON.stringify({ event: 'email_job_already_sent', jobId: input.jobId }));
      return;
    }

    await this.emailJobService.markAsProcessing(input.jobId);

    try {
      const providerConfig = await this.prisma.tenantEmailProvider.findFirst({
        where: {
          id: emailJob.providerId,
          tenantId: emailJob.tenantId,
          isActive: true,
        },
      });

      if (!providerConfig) {
        throw new Error(`Active provider ${emailJob.providerId} not found`);
      }

      const provider = this.factory.create(providerConfig);
      const result = await provider.send({
        to: emailJob.to,
        subject: emailJob.subject,
        content: emailJob.content,
      });

      await this.emailJobService.markAsSent(input.jobId, result.messageId);

      this.logger.log(JSON.stringify({
        event: 'email_job_sent',
        jobId: input.jobId,
        tenantId: emailJob.tenantId,
        providerId: emailJob.providerId,
        messageId: result.messageId,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const maxReceiveCount = this.configService.get<number>('EMAIL_WORKER_MAX_RECEIVE_COUNT', 5);
      const isFinalAttempt = (input.receiveCount ?? 1) >= maxReceiveCount;

      await this.emailJobService.markAsFailed(input.jobId, errorMessage, isFinalAttempt);

      this.logger.error(JSON.stringify({
        event: 'email_job_failed',
        jobId: input.jobId,
        receiveCount: input.receiveCount,
        finalAttempt: isFinalAttempt,
        errorMessage,
      }));

      throw error;
    }
  }
}
```

---

## 18. Lambda worker com partial batch response

Criar `src/lambda/email-worker.handler.ts`.

Implementar com `SQSEvent` e `SQSBatchResponse`.

Exemplo:

```ts
import { SQSEvent, SQSBatchResponse } from 'aws-lambda';
import { NestFactory } from '@nestjs/core';
import { WorkersModule } from 'src/workers/workers.module';
import { EmailWorkerService } from 'src/workers/email-worker.service';

let workerService: EmailWorkerService | null = null;

async function getWorkerService(): Promise<EmailWorkerService> {
  if (!workerService) {
    const app = await NestFactory.createApplicationContext(WorkersModule, {
      logger: ['error', 'warn', 'log'],
    });
    workerService = app.get(EmailWorkerService);
  }

  return workerService;
}

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const service = await getWorkerService();
  const batchItemFailures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body) as {
        jobId: string;
        correlationId?: string;
      };

      await service.processJob({
        jobId: body.jobId,
        correlationId: body.correlationId,
        receiveCount: Number(record.attributes.ApproximateReceiveCount ?? '1'),
      });
    } catch (error) {
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
```

Importante:

- Não jogar erro fora do loop se estiver usando partial batch response.
- Retornar IDs das mensagens que falharam.
- Mensagens processadas com sucesso não devem ser reprocessadas.

---

## 19. Lambda HTTP API para NestJS

Criar `src/lambda/api.handler.ts`.

Exemplo com `@codegenie/serverless-express`:

```ts
import { Handler, Context, Callback } from 'aws-lambda';
import serverlessExpress from '@codegenie/serverless-express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from 'src/app.module';
import { ValidationPipe } from '@nestjs/common';

let cachedHandler: Handler;

async function bootstrap(): Promise<Handler> {
  if (cachedHandler) return cachedHandler;

  const expressApp = express();
  const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  nestApp.setGlobalPrefix('v1');
  await nestApp.init();

  cachedHandler = serverlessExpress({ app: expressApp });
  return cachedHandler;
}

export const handler: Handler = async (event: any, context: Context, callback: Callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const handler = await bootstrap();
  return handler(event, context, callback);
};
```

Manter `src/main.ts` para execução local:

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('v1');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

---

## 20. Serverless Framework

Criar `serverless.yml` na raiz.

Modelo inicial obrigatório:

```yml
service: mailworks-api
frameworkVersion: '4'

plugins:
  - serverless-esbuild
  - serverless-offline
  - serverless-dotenv-plugin

provider:
  name: aws
  runtime: nodejs20.x
  region: ${opt:region, 'us-east-1'}
  stage: ${opt:stage, 'dev'}
  architecture: arm64
  memorySize: 512
  timeout: 30
  logRetentionInDays: 14
  environment:
    NODE_ENV: ${self:provider.stage}
    AWS_REGION: ${self:provider.region}
    DATABASE_URL: ${env:DATABASE_URL}
    AWS_SQS_EMAIL_QUEUE_URL:
      Ref: EmailQueue
    AWS_SES_FROM_EMAIL: ${env:AWS_SES_FROM_EMAIL}
    AWS_SES_FROM_NAME: ${env:AWS_SES_FROM_NAME, 'MailWorks'}
    EMAIL_WORKER_MAX_RECEIVE_COUNT: 5
    TWO_FACTOR_TTL_SECONDS: 1800
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - sqs:SendMessage
            - sqs:GetQueueAttributes
          Resource:
            - Fn::GetAtt: [EmailQueue, Arn]
        - Effect: Allow
          Action:
            - sqs:ReceiveMessage
            - sqs:DeleteMessage
            - sqs:ChangeMessageVisibility
            - sqs:GetQueueAttributes
          Resource:
            - Fn::GetAtt: [EmailQueue, Arn]
        - Effect: Allow
          Action:
            - ses:SendEmail
            - ses:SendRawEmail
          Resource: '*'

package:
  individually: true

custom:
  esbuild:
    bundle: true
    minify: false
    sourcemap: true
    target: node20
    platform: node
    concurrency: 10
    external:
      - '@prisma/client'
      - '.prisma/client'

functions:
  api:
    handler: src/lambda/api.handler
    description: MailWorks NestJS HTTP API
    timeout: 30
    events:
      - httpApi: '*'

  emailWorker:
    handler: src/lambda/email-worker.handler
    description: Processes MailWorks email jobs from SQS
    timeout: 60
    memorySize: 1024
    reservedConcurrency: 5
    events:
      - sqs:
          arn:
            Fn::GetAtt: [EmailQueue, Arn]
          batchSize: 10
          maximumBatchingWindow: 5
          functionResponseType: ReportBatchItemFailures

resources:
  Resources:
    EmailDeadLetterQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: ${self:service}-${self:provider.stage}-email-dlq
        MessageRetentionPeriod: 1209600

    EmailQueue:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: ${self:service}-${self:provider.stage}-email-queue
        VisibilityTimeout: 360
        MessageRetentionPeriod: 345600
        RedrivePolicy:
          deadLetterTargetArn:
            Fn::GetAtt: [EmailDeadLetterQueue, Arn]
          maxReceiveCount: 5

    EmailDlqMessagesAlarm:
      Type: AWS::CloudWatch::Alarm
      Properties:
        AlarmName: ${self:service}-${self:provider.stage}-dlq-has-messages
        AlarmDescription: Alarm when MailWorks email DLQ has messages
        Namespace: AWS/SQS
        MetricName: ApproximateNumberOfMessagesVisible
        Dimensions:
          - Name: QueueName
            Value:
              Fn::GetAtt: [EmailDeadLetterQueue, QueueName]
        Statistic: Sum
        Period: 60
        EvaluationPeriods: 1
        Threshold: 0
        ComparisonOperator: GreaterThanThreshold
        TreatMissingData: notBreaching

  Outputs:
    EmailQueueUrl:
      Value:
        Ref: EmailQueue
    EmailQueueArn:
      Value:
        Fn::GetAtt: [EmailQueue, Arn]
    EmailDeadLetterQueueUrl:
      Value:
        Ref: EmailDeadLetterQueue
    EmailDeadLetterQueueArn:
      Value:
        Fn::GetAtt: [EmailDeadLetterQueue, Arn]
```

A IA pode ajustar esse arquivo se o plugin/versão do Serverless exigir sintaxe levemente diferente, mas deve manter:

- fila principal;
- DLQ;
- redrive policy;
- Lambda SQS trigger;
- partial batch response;
- CloudWatch alarm;
- permissões IAM mínimas;
- outputs úteis.

---

## 21. Seed/bootstrap

Refatorar `prisma/seed.ts` para:

- criar tenant dev;
- criar provider SES;
- criar provider SMTP opcional;
- gerar API key raw;
- salvar hash;
- imprimir raw key no console.

Exemplo de output:

```txt
Seed concluído.
Tenant ID: ...
Provider ID: ...
API Key: mw_dev_xxxxxxxxx

Copie esta API key para testar chamadas com header:
x-api-key: mw_dev_xxxxxxxxx
```

Nunca salvar API key raw no banco.

---

## 22. DTOs e validação

Usar `class-validator` com validações fortes.

Exemplos:

### SendEmailDTO

```ts
export class SendEmailDTO {
  @IsEmail()
  to!: string;

  @IsString()
  @MinLength(1)
  subject!: string;

  @IsString()
  @MinLength(1)
  content!: string;
}
```

### SendBulkEmailDTO

Validar:

- array não vazio;
- máximo 1000;
- e-mails válidos;
- subject/content obrigatórios quando não usar template;
- templateId obrigatório quando usar template mode.

---

## 23. Logs estruturados

Todos os pontos importantes devem logar JSON stringificado.

Eventos mínimos:

```txt
email_job_created
email_job_published_to_sqs
email_worker_received_message
email_job_processing_started
email_job_sent
email_job_failed
email_job_already_sent
campaign_created
bulk_email_jobs_queued
two_factor_challenge_created
two_factor_verified
```

Exemplo:

```ts
this.logger.log(JSON.stringify({
  event: 'email_job_sent',
  jobId,
  tenantId,
  providerType,
  messageId,
  durationMs,
}));
```

Motivo: CloudWatch Logs fica muito mais útil quando os logs são estruturados.

---

## 24. Atualização de campaign status

Após processar jobs, atualizar status da campanha.

Implementar método em `CampaignsService`:

```ts
refreshCampaignStatus(campaignId: string): Promise<void>
```

Regra:

- Se ainda há `PENDING` ou `PROCESSING`, status `PROCESSING`.
- Se todos `SENT`, status `COMPLETED`.
- Se há `FAILED`/`FAILED_FINAL` e nenhum pendente/processando, status `COMPLETED_WITH_FAILURES`.
- Se todos falharam, status `FAILED`.

Chamar após cada processamento de job com `campaignId`.

---

## 25. Testes mínimos

Implementar testes unitários para:

1. `ApiKeyGuard`
   - sem header retorna 401;
   - key inválida retorna 401;
   - key válida injeta `request.auth`.

2. `EmailService`
   - cria EmailJob;
   - publica no publisher;
   - retorna status pending.

3. `EmailWorkerService`
   - ignora job já `SENT`;
   - marca como sent quando provider envia;
   - marca failed e relança erro quando provider falha.

4. `template-renderer.util`
   - substitui variáveis;
   - acusa variáveis ausentes.

5. `TwoFactorService`
   - gera challenge;
   - verifica código correto;
   - recusa código expirado/consumido/incorreto.

Não precisa teste E2E complexo se o prazo estiver curto, mas o build deve passar.

---

## 26. Comandos de validação

A IA deve rodar, nesta ordem:

```bash
npm install
npx prisma format
npx prisma validate
npx prisma generate
npm run build
npm run lint
npm run test
```

Se algum comando falhar:

- corrigir;
- rodar novamente;
- registrar no `EXIT.md`.

---

## 27. Documentação obrigatória final

Criar um único documento principal de aprendizado:

```txt
docs/AWS_EVENT_DRIVEN_GUIDE.md
```

Esse documento deve ser extremamente didático e focado em AWS.

Ele deve ensinar um dev iniciante/intermediário a entender, rodar e explicar o projeto.

Estrutura obrigatória:

```md
# MailWorks AWS Event-Driven Guide

## 1. O que este projeto faz

## 2. Problema original: envio síncrono e gargalo

## 3. Arquitetura final

## 4. Por que SQS foi usado

## 5. O que é DLQ e como ela protege o sistema

## 6. Como Lambda consome SQS

## 7. O que é partial batch response

## 8. Como o Amazon SES entra no fluxo

## 9. Como o Serverless Framework cria a infra

## 10. Como configurar AWS localmente

## 11. Como verificar e-mail/domínio no SES

## 12. Como subir a infraestrutura

## 13. Como rodar migrations do Prisma

## 14. Como criar tenant/provider/API key de dev

## 15. Como enviar um e-mail unitário

## 16. Como enviar e-mail em massa

## 17. Como consultar status de job/campaign

## 18. Como testar 2FA

## 19. Como simular falha e ver DLQ

## 20. Como olhar logs no CloudWatch

## 21. Como explicar esse projeto em entrevista

## 22. Trade-offs e melhorias futuras

## 23. Comandos úteis

## 24. Troubleshooting
```

A seção “Como explicar em entrevista” deve conter uma fala pronta:

```md
Eu parti de uma API de e-mails simples e refatorei para uma arquitetura orientada a eventos na AWS. A API autentica o tenant por API key, persiste um EmailJob no Postgres e publica uma mensagem no SQS. Uma Lambda worker consome a fila, resolve o provider pelo Factory/Strategy Pattern e envia via Amazon SES. Se houver erro, a mensagem é retentada automaticamente e, após o limite, vai para uma DLQ. Também deixei logs estruturados e alarmes no CloudWatch. A principal decisão foi tirar o envio do ciclo HTTP e modelar o processamento como pipeline assíncrono resiliente.
```

Incluir também seção “Por que isso importa em sistemas financeiros/escala”:

- evita timeout em request HTTP;
- melhora resiliência contra provider instável;
- permite backpressure;
- permite auditoria por job;
- torna falhas observáveis;
- permite retry controlado;
- separa ingestão de processamento.

---

## 28. README

Substituir o README boilerplate por um README curto e profissional.

Deve conter:

- nome do projeto;
- arquitetura em ASCII;
- stack;
- endpoints principais;
- como rodar local;
- como fazer deploy;
- link para `docs/AWS_EVENT_DRIVEN_GUIDE.md`;
- limitações.

---

## 29. Critérios de aceite

A implementação só está concluída quando todos forem verdadeiros:

- [ ] Projeto compila.
- [ ] Prisma schema válido.
- [ ] Bull removido.
- [ ] Redis removido se não houver outro uso real.
- [ ] SQS publisher implementado.
- [ ] Lambda worker SQS implementada.
- [ ] Partial batch response implementado.
- [ ] DLQ configurada no `serverless.yml`.
- [ ] CloudWatch alarm de DLQ configurado no `serverless.yml`.
- [ ] SES provider implementado.
- [ ] SMTP provider continua funcionando.
- [ ] API key guard valida key no banco.
- [ ] API key não é salva em texto puro.
- [ ] Email unitário funciona.
- [ ] Email por template funciona.
- [ ] Email em massa cria campaign e jobs.
- [ ] Consulta de job funciona respeitando tenant.
- [ ] Consulta de campaign funciona respeitando tenant.
- [ ] 2FA usa EmailJob/SQS e não envio síncrono.
- [ ] Logs estruturados existem nos pontos críticos.
- [ ] README atualizado.
- [ ] `docs/AWS_EVENT_DRIVEN_GUIDE.md` criado.
- [ ] `EXIT.md` criado na pasta da spec.
- [ ] Commits realizados.
- [ ] PR aberto em português brasileiro ou falha documentada no `EXIT.md`.

---

## 30. Roteiro de implementação recomendado para a IA

### Fase 1 — Preparação

1. Criar branch.
2. Copiar esta spec para `ai/specs/2026-06-06-mailworks-aws-event-driven/SPEC.md`.
3. Rodar build atual para mapear erros.
4. Anotar erros iniciais no `EXIT.md`.

### Fase 2 — Dependências

1. Remover Bull/Redis.
2. Adicionar AWS SDK, Serverless e libs Lambda.
3. Ajustar imports quebrados.

### Fase 3 — Banco

1. Atualizar Prisma schema.
2. Atualizar seed.
3. Gerar migration.
4. Rodar Prisma validate/generate.

### Fase 4 — Auth

1. Criar api-key util.
2. Reimplementar guard.
3. Criar decorator Auth.
4. Ajustar controllers para usar AuthContext.

### Fase 5 — Providers

1. Ajustar interface `IEmailProvider`.
2. Ajustar SMTP provider.
3. Criar SES provider.
4. Atualizar factory.

### Fase 6 — SQS

1. Criar AwsModule.
2. Criar publisher interface.
3. Criar SQS publisher.
4. Refatorar EmailService.

### Fase 7 — Worker

1. Criar WorkersModule.
2. Criar EmailWorkerService.
3. Criar Lambda handler SQS.
4. Implementar partial batch response.
5. Testar unitariamente.

### Fase 8 — API features

1. Templates.
2. Providers endpoints.
3. Email unitário.
4. Email por template.
5. Bulk email.
6. Job status.
7. Campaign status.
8. 2FA via jobs.

### Fase 9 — Serverless

1. Criar `serverless.yml`.
2. Criar HTTP API Lambda.
3. Criar worker Lambda.
4. Criar SQS queue.
5. Criar DLQ.
6. Criar CloudWatch alarm.
7. Configurar IAM.

### Fase 10 — Docs

1. Atualizar README.
2. Criar `docs/AWS_EVENT_DRIVEN_GUIDE.md`.
3. Explicar AWS de forma didática.
4. Incluir fala pronta de entrevista.

### Fase 11 — Validação final

1. Rodar format.
2. Rodar Prisma validate.
3. Rodar build.
4. Rodar lint.
5. Rodar tests.
6. Corrigir tudo que quebrar.
7. Atualizar `EXIT.md`.
8. Commitar.
9. Abrir PR.

---

## 31. Comandos úteis esperados no README/doc

```bash
# instalar dependências
npm install

# subir Postgres local
docker compose up -d postgres

# migrations
npx prisma migrate dev
npx prisma generate

# seed
npx prisma db seed

# rodar API local
npm run start:dev

# deploy AWS
npx serverless deploy --stage dev --region us-east-1

# remover stack AWS
npx serverless remove --stage dev --region us-east-1

# logs da API
npx serverless logs -f api --stage dev --region us-east-1

# logs do worker
npx serverless logs -f emailWorker --stage dev --region us-east-1
```

---

## 32. Exemplos de cURL para documentação

### Health

```bash
curl https://<api-url>/v1/health
```

### Enviar e-mail

```bash
curl -X POST https://<api-url>/v1/emails/send \
  -H "content-type: application/json" \
  -H "x-api-key: mw_dev_xxxxx" \
  -d '{
    "to": "verified-recipient@example.com",
    "subject": "Teste MailWorks AWS",
    "content": "<p>Olá! Este e-mail foi enfileirado no SQS e enviado via SES.</p>"
  }'
```

### Consultar job

```bash
curl https://<api-url>/v1/email-jobs/<job-id> \
  -H "x-api-key: mw_dev_xxxxx"
```

### Envio em massa

```bash
curl -X POST https://<api-url>/v1/emails/bulk \
  -H "content-type: application/json" \
  -H "x-api-key: mw_dev_xxxxx" \
  -d '{
    "name": "Demo AWS bulk",
    "recipients": ["a@example.com", "b@example.com"],
    "subject": "Campanha demo",
    "content": "<p>Mensagem enviada de forma assíncrona.</p>"
  }'
```

---

## 33. Limitações assumidas

Documentar claramente:

- SES sandbox exige e-mails/domínios verificados.
- Produção real precisa pedir saída do sandbox SES.
- Bulk com milhares/milhões de destinatários deveria usar upload em S3 e processamento paginado.
- Provider credentials deveriam ser criptografadas em repouso.
- Rate limiting por tenant ainda não está implementado.
- Webhooks de bounce/complaint do SES podem ser evolução futura via SNS.
- Banco Postgres gerenciado na AWS exigiria RDS/Aurora e configuração de rede/VPC, fora do escopo inicial.

---

## 34. Melhorias futuras para roadmap

Adicionar no README/doc:

1. SNS para bounce/complaint do SES.
2. Rate limit por tenant.
3. S3 para upload de CSV grande.
4. Step Functions para campanhas complexas.
5. DynamoDB idempotency table.
6. Secrets Manager para credenciais de providers.
7. RDS Proxy se usar Lambda com RDS em produção.
8. Dashboard com métricas de campanha.
9. Multi-provider fallback: SES → SMTP → Mailgun.
10. Webhooks de delivery status.

---

## 35. Fala final para entrevista

A documentação deve deixar esta fala pronta:

> Eu peguei uma API de envio de e-mails e refatorei para uma arquitetura event-driven na AWS. Antes, o envio estava muito acoplado ao processamento da aplicação. Agora, a API autentica o tenant por API key, cria um EmailJob no banco e publica uma mensagem no SQS. Uma Lambda worker consome a fila, resolve o provider por Factory/Strategy Pattern e envia via Amazon SES. O sistema tem retry, DLQ, logs estruturados e alarme no CloudWatch para mensagens que falham repetidamente. A decisão principal foi separar ingestão de processamento, garantindo resiliência, backpressure e rastreabilidade por job.

---

## 36. Referências oficiais para consultar durante a implementação

- Amazon SQS Developer Guide: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html
- Amazon SQS Dead Letter Queues: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- AWS Lambda with SQS: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS Lambda SQS error handling: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS Lambda partial batch responses: https://docs.aws.amazon.com/prescriptive-guidance/latest/lambda-event-filtering-partial-batch-responses-for-sqs/benefits-partial-batch-responses.html
- Amazon SES SDK JavaScript v3: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/ses-examples-sending-email.html
- Serverless Framework AWS SQS events: https://www.serverless.com/framework/docs/providers/aws/events/sqs
- Serverless Framework AWS resources: https://www.serverless.com/framework/docs/providers/aws/guide/resources

---

## 37. Critério de sucesso narrativo

Este projeto deve permitir que o dev diga com segurança:

- sei explicar por que uma fila é necessária;
- sei explicar SQS vs processamento síncrono;
- sei explicar DLQ;
- sei explicar retry e falhas operacionais;
- sei explicar Lambda consumindo evento;
- sei explicar SES como provider;
- sei explicar CloudWatch logs/alarms;
- sei explicar trade-offs de Postgres + Lambda;
- sei explicar como isso evoluiria em produção.

Esse é o objetivo real da implementação.
