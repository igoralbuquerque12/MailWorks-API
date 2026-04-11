# SPEC PARTE 1 — MailWorks-API: Fundação e Envio Funcional

## Objetivo da Parte 1

Construir a fundação técnica da plataforma com foco em:
1. Configuração do banco de dados (PostgreSQL + Prisma) com as entidades core.
2. Implementação do `SmtpProvider` como primeiro adapter funcional.
3. Arquitetura de fila assíncrona com Bull + Redis (Producer/Consumer).
4. Tornar funcionais os dois fluxos existentes: **envio único de e-mail** e **autenticação 2FA**.

Ao final da Parte 1, a API deve estar completamente funcional nos dois fluxos, com toda a arquitetura desacoplada no lugar.

---

## Escopo Estrito (O que fazer)

✅ Configurar Prisma com PostgreSQL  
✅ Criar schema Prisma com os models: `Tenant`, `TenantEmailProvider`, `EmailJob`  
✅ Criar `PrismaService` como provider global injetável  
✅ Criar interface `IEmailProvider` e implementar `SmtpProvider`  
✅ Criar `EmailProviderFactory`  
✅ Configurar Bull Queue com Redis para processamento assíncrono  
✅ Refatorar `EmailService` para ser 100% assíncrono (enfileira, não envia direto)  
✅ Criar `EmailProcessor` (worker que consome a fila e faz o envio real)  
✅ Refatorar `TwoFactorService` para usar o novo `EmailService`  
✅ Manter `CacheService` com Redis (ioredis) para armazenar códigos 2FA  
✅ Criar `docker-compose.yml` com PostgreSQL + Redis  
✅ Criar seed Prisma com tenant padrão de desenvolvimento (`prisma/seed.ts`)  
✅ `.env.example` documentado  

## Fora de Escopo (O que NÃO fazer agora)

❌ Autenticação/autorização de tenants (API Key, JWT)  
❌ CRUD de tenants via API  
❌ Envio em massa / batch  
❌ Templates de e-mail  
❌ Novos adapters (Mailgun, Resend, SES)  
❌ RabbitMQ (substituído por Bull/Redis nesta fase)  
❌ Criptografia das credenciais no banco  

---

## Estrutura de Diretórios Alvo

```
prisma/
├── schema.prisma
└── seed.ts

src/
├── common/
│   ├── interfaces/
│   │   └── email-provider.interface.ts
│   └── enums/
│       ├── provider-type.enum.ts
│       └── job-status.enum.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── providers/
│   ├── smtp/
│   │   └── smtp.provider.ts
│   ├── email-provider.factory.ts
│   └── providers.module.ts
├── queue/
│   ├── queue.module.ts
│   ├── queue.constants.ts
│   └── email.processor.ts
├── email/
│   ├── dto/
│   │   └── send-email.dto.ts
│   ├── email.controller.ts
│   ├── email.module.ts
│   └── email.service.ts
├── two-factor/
│   ├── dto/
│   │   ├── index.ts
│   │   ├── send-two-factor.dto.ts
│   │   └── verify-two-factor.dto.ts
│   ├── two-factor.controller.ts
│   ├── two-factor.module.ts
│   └── two-factor.service.ts
├── cache/
│   ├── cache.module.ts
│   └── cache.service.ts
├── app.module.ts
└── main.ts
```

---

## Schema Prisma (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id             String                @id @default(uuid())
  name           String
  apiKey         String                @unique @map("api_key")
  isActive       Boolean               @default(true) @map("is_active")
  createdAt      DateTime              @default(now()) @map("created_at")
  updatedAt      DateTime              @updatedAt @map("updated_at")
  emailProviders TenantEmailProvider[]
  emailJobs      EmailJob[]

  @@map("tenants")
}

model TenantEmailProvider {
  id           String       @id @default(uuid())
  tenantId     String       @map("tenant_id")
  providerType ProviderType @map("provider_type")
  config       Json
  isActive     Boolean      @default(true) @map("is_active")
  createdAt    DateTime     @default(now()) @map("created_at")
  tenant       Tenant       @relation(fields: [tenantId], references: [id])

  @@map("tenant_email_providers")
}

model EmailJob {
  id           String    @id @default(uuid())
  tenantId     String    @map("tenant_id")
  to           String
  subject      String
  content      String
  status       JobStatus @default(PENDING)
  attempts     Int       @default(0)
  errorMessage String?   @map("error_message")
  createdAt    DateTime  @default(now()) @map("created_at")
  processedAt  DateTime? @map("processed_at")
  tenant       Tenant    @relation(fields: [tenantId], references: [id])

  @@map("email_jobs")
}

enum ProviderType {
  SMTP
  MAILGUN
  RESEND
  SES
}

enum JobStatus {
  PENDING
  PROCESSING
  SENT
  FAILED
}
```

---

## PrismaService (`src/prisma/prisma.service.ts`)

- Estende `PrismaClient` e implementa `OnModuleInit` e `OnModuleDestroy`.
- Chama `this.$connect()` no `onModuleInit` e `this.$disconnect()` no `onModuleDestroy`.
- Deve ser registrado em `PrismaModule` como provider e exportado.
- `PrismaModule` deve ser decorado com `@Global()` para que qualquer módulo possa injetar `PrismaService` sem importar o módulo explicitamente.

---

## Detalhamento dos Módulos

### PrismaModule
- Decorado com `@Global()`.
- Registra e exporta `PrismaService`.
- Importado uma única vez no `AppModule`.

### ProvidersModule
- Exporta `EmailProviderFactory` como provider injetável.
- O factory recebe um objeto do tipo `TenantEmailProvider` (gerado pelo Prisma Client) e retorna o `IEmailProvider` correto.
- Switch por `providerType` no factory — cada case instancia um adapter diferente.
- `SmtpProvider` recebe a config SMTP extraída do campo `config` (tipo `Json` do Prisma).
- O campo `config` deve ser acessado com cast explícito dentro do factory: `providerConfig.config as unknown as SmtpConfig`.

### QueueModule
- Configura `BullModule.forRootAsync` com as credenciais Redis via `ConfigService`.
- Registra a fila `EMAIL_QUEUE` (`BullModule.registerQueue`).
- Exporta o `BullModule` para que outros módulos possam injetar o queue producer.
- `EmailProcessor` é o consumer `@Processor(EMAIL_QUEUE)`.

### EmailModule
- `EmailService` injeta `PrismaService` diretamente.
- `EmailService.send()` NÃO envia o e-mail — ele:
  1. Busca o `TenantEmailProvider` ativo: `prisma.tenantEmailProvider.findFirst({ where: { tenantId, isActive: true } })`.
  2. Lança `NotFoundException` se não encontrar provider.
  3. Cria um `EmailJob`: `prisma.emailJob.create({ data: { tenantId, to, subject, content } })`.
  4. Adiciona o job à fila Bull com `{ jobId }`.
  5. Retorna `{ jobId, status: 'PENDING' }`.
- O controller responde com `202 Accepted`.
- O `tenantId` é lido do header `X-Tenant-ID`.

### EmailProcessor (Worker)
- `@Process()` consome jobs da `EMAIL_QUEUE`.
- Injeta `PrismaService` e `EmailProviderFactory`.
- Fluxo:
  1. `prisma.emailJob.findUnique({ where: { id: jobId } })`.
  2. `prisma.emailJob.update({ where: { id }, data: { status: 'PROCESSING', attempts: { increment: 1 } } })`.
  3. `prisma.tenantEmailProvider.findFirst({ where: { tenantId: emailJob.tenantId, isActive: true } })`.
  4. `EmailProviderFactory.create(providerConfig)` → retorna `IEmailProvider`.
  5. `provider.send({ to, subject, content })`.
  6. `prisma.emailJob.update({ where: { id }, data: { status: 'SENT', processedAt: new Date() } })`.
  7. Em caso de erro: `prisma.emailJob.update({ where: { id }, data: { status: 'FAILED', errorMessage } })` e re-lança o erro para o Bull aplicar o retry.
- Configuração de retry: `{ attempts: 3, backoff: { type: 'exponential', delay: 2000 } }`.

### TwoFactorModule
- `TwoFactorService.send()`:
  1. Gera código de 6 dígitos com `crypto.randomInt(100000, 999999)`.
  2. Salva no Redis com chave `2fa:{email}` e TTL de 1800 segundos.
  3. Chama `EmailService.send(DEFAULT_TENANT_ID, { to, subject, content })`.
- `TwoFactorService.verify()`:
  1. Busca código no Redis com chave `2fa:{email}`.
  2. Compara — retorna `boolean`.
  3. Se válido, deleta a chave do Redis (uso único).

### CacheService
- Baseado em `ioredis`, sem alterações em relação à versão anterior.
- Método `delete(key)` necessário para invalidar código 2FA após uso.

---

## Seed Prisma (`prisma/seed.ts`)

- Usar `PrismaClient` diretamente (sem NestJS).
- Criar um `Tenant` com `apiKey: 'dev-api-key-insecure'` via `upsert` (idempotente).
- Criar um `TenantEmailProvider` do tipo `SMTP` associado ao tenant.
- As credenciais SMTP do seed devem vir das variáveis `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` do `.env`, com fallback para valores placeholder.
- Ao final, exibir no console o `DEFAULT_TENANT_ID` para ser copiado no `.env`.
- Registrar no `package.json`:
```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```
- Rodar com: `npx prisma db seed`

---

## Fluxo de Dados Completo — Envio de E-mail

```
POST /email
  Headers: { X-Tenant-ID: "uuid-do-tenant" }
  Body: { to, subject, content }
          │
          ▼
  EmailController
    → lê tenantId do header
    → chama EmailService.send(tenantId, dto)
          │
          ▼
  EmailService (usa PrismaService)
    → prisma.tenantEmailProvider.findFirst WHERE tenantId AND isActive = true
    → prisma.emailJob.create { tenantId, to, subject, content, status: PENDING }
    → emailQueue.add({ jobId: emailJob.id })
    → retorna { jobId, status: "PENDING" }
          │
          ▼
  HTTP Response: 202 Accepted { jobId, status: "PENDING" }

  [Assíncrono — em background]
          │
          ▼
  EmailProcessor.handle(job) (usa PrismaService)
    → prisma.emailJob.findUnique { id: jobId }
    → prisma.emailJob.update → status: PROCESSING, attempts: increment(1)
    → prisma.tenantEmailProvider.findFirst WHERE tenantId AND isActive
    → EmailProviderFactory.create(providerConfig) → SmtpProvider
    → smtpProvider.send({ to, subject, content })
    → prisma.emailJob.update → status: SENT, processedAt: now()
```

---

## Fluxo de Dados Completo — Two-Factor

```
POST /two-factor/send
  Body: { email }
          │
          ▼
  TwoFactorService.send()
    → code = crypto.randomInt(100000, 999999).toString()
    → redis.set("2fa:{email}", code, EX 1800)
    → EmailService.send(DEFAULT_TENANT_ID, {
        to: email,
        subject: "Seu código de verificação",
        content: `Seu código é: ${code}`
      })
  HTTP Response: 200 OK { message: "Código enviado!" }

POST /two-factor/verify
  Body: { email, code }
          │
          ▼
  TwoFactorService.verify()
    → savedCode = redis.get("2fa:{email}")
    → if savedCode === code → redis.del("2fa:{email}") → return true
    → else → return false
  HTTP Response: 200 OK { valid: true | false }
```

---

## Variáveis de Ambiente (.env)

```env
# App
PORT=3000
NODE_ENV=development

# PostgreSQL — usada pelo Prisma
DATABASE_URL="postgresql://mailworks:mailworks@localhost:5432/mailworks"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Tenant padrão para 2FA e desenvolvimento (preenchido após npx prisma db seed)
DEFAULT_TENANT_ID=

# Bull Queue
QUEUE_MAX_ATTEMPTS=3
QUEUE_BACKOFF_DELAY=2000

# SMTP para o seed (opcional, pode preencher depois direto no banco)
SMTP_HOST=smtp.gmail.com
SMTP_USER=SEU_EMAIL@gmail.com
SMTP_PASS=SUA_APP_PASSWORD
```

---

## Docker Compose (Infraestrutura Local)

Dois serviços:
- `postgres`: imagem `postgres:16`, porta `5432`, volume persistente.
- `redis`: imagem `redis:7-alpine`, porta `6379`.

---

## Dependências

Adicionar ao `package.json`:
```
prisma
@prisma/client
```

Remover do `package.json`:
```
typeorm
@nestjs/typeorm
pg
```

---

## Critérios de Aceite da Parte 1

- [ ] `npx prisma migrate dev` cria as tabelas corretamente no banco.
- [ ] `npx prisma db seed` cria o tenant padrão e exibe o `DEFAULT_TENANT_ID` no console.
- [ ] `POST /email` com header `X-Tenant-ID` válido retorna `202` imediatamente com `{ jobId, status: "PENDING" }`.
- [ ] O e-mail é efetivamente entregue em segundo plano pelo worker.
- [ ] `EmailJob` no banco reflete os estados `PENDING → PROCESSING → SENT`.
- [ ] `POST /two-factor/send` com `{ email }` enfileira um e-mail com o código gerado aleatoriamente.
- [ ] `POST /two-factor/verify` retorna `{ valid: true }` para o código correto e `{ valid: false }` para incorreto ou expirado.
- [ ] Após verificação bem-sucedida, o código é removido do Redis (uso único).
- [ ] Falhas no envio SMTP atualizam o `EmailJob` para `FAILED` com a mensagem de erro.
- [ ] `docker-compose up` sobe toda a infraestrutura necessária.
- [ ] Nenhuma credencial está hardcoded no código-fonte.