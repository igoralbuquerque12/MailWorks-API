# MailWorks AWS Event-Driven Email Delivery API

API multi-tenant de entrega de e-mails construída com **NestJS**, **Prisma**, **Neon PostgreSQL** e uma arquitetura **event-driven/serverless na AWS**.

O projeto foi desenhado para não fazer o envio de e-mail de forma síncrona dentro da requisição HTTP. Em vez disso, a API valida o tenant, persiste um job no banco, publica uma mensagem em uma fila SQS e delega o envio real para uma Lambda worker. Isso permite retry, rastreabilidade, DLQ, controle de status e maior resiliência operacional.

---

## Sumário

- [Visão geral](#visão-geral)
- [Principais decisões arquiteturais](#principais-decisões-arquiteturais)
- [Stack utilizada](#stack-utilizada)
- [Arquitetura de infraestrutura](#arquitetura-de-infraestrutura)
- [Fluxo de execução dos endpoints robustos](#fluxo-de-execução-dos-endpoints-robustos)
- [Como funciona o processamento assíncrono](#como-funciona-o-processamento-assíncrono)
- [Multi-tenancy e autenticação](#multi-tenancy-e-autenticação)
- [Modelagem de dados](#modelagem-de-dados)
- [Endpoints principais](#endpoints-principais)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Como rodar localmente](#como-rodar-localmente)
- [Como validar o projeto](#como-validar-o-projeto)
- [Deploy na AWS](#deploy-na-aws)
- [Pontos de atenção e melhorias futuras](#pontos-de-atenção-e-melhorias-futuras)

---

## Visão geral

O **MailWorks** é uma API para envio de e-mails com suporte a múltiplos tenants. Cada tenant possui sua própria API key, seus próprios providers de e-mail, templates, jobs e campanhas.

O fluxo principal é:

```text
Client
  -> API Gateway
    -> Lambda API NestJS
      -> Neon PostgreSQL
      -> SQS
        -> Lambda Worker
          -> SES ou SMTP

Falhas repetidas
  -> SQS DLQ
    -> CloudWatch Alarm
```

A API expõe endpoints para:

- envio unitário de e-mail;
- envio por template;
- envio em massa;
- envio de código 2FA;
- consulta de status de jobs;
- consulta de status agregado de campanhas;
- gerenciamento de providers e templates por tenant.

---

## Principais decisões arquiteturais

Este projeto foi desenvolvido com foco em arquitetura backend real, não apenas em CRUD.

As principais decisões foram:

1. **Separar requisição HTTP do envio real**
   - A API recebe a requisição, valida, persiste e enfileira.
   - O envio acontece de forma assíncrona em uma Lambda worker.

2. **Persistir o estado do envio**
   - Cada envio vira um `EmailJob`.
   - O job possui lifecycle próprio: `PENDING`, `PROCESSING`, `SENT`, `FAILED` e `FAILED_FINAL`.

3. **Usar SQS para desacoplamento**
   - A API não depende diretamente do tempo de resposta do SES ou SMTP.
   - A fila permite retry e absorve picos.

4. **Usar DLQ para falhas finais**
   - Mensagens que falham repetidamente são enviadas para uma Dead Letter Queue.
   - Um alarme CloudWatch monitora mensagens na DLQ.

5. **Manter isolamento por tenant**
   - Todas as rotas protegidas usam `x-api-key`.
   - A API key identifica tenant e provider ativo.
   - Consultas de jobs e campanhas são sempre filtradas por tenant.

6. **Permitir providers plugáveis**
   - O sistema resolve o provider ativo do tenant.
   - Atualmente há suporte operacional para SES e SMTP.

---

## Stack utilizada

### Backend

- Node.js
- TypeScript
- NestJS 11
- Express
- Prisma 6
- Class Validator
- Class Transformer

### Banco de dados

- Neon PostgreSQL
- Prisma Client
- Prisma Migrations

### AWS / Infraestrutura

- AWS Lambda
- API Gateway HTTP API
- AWS SQS
- SQS Dead Letter Queue
- Amazon SES
- CloudWatch Alarm
- IAM
- Serverless Framework 3

### Providers de e-mail

- Amazon SES
- SMTP externo via Nodemailer

### Qualidade e testes

- Jest
- Supertest
- ESLint
- Prettier

---

## Arquitetura de infraestrutura

A imagem abaixo representa a arquitetura macro do projeto, mostrando a entrada HTTP, camada serverless, banco, fila, worker, providers e mecanismos de falha.

![alt text](public/flow-mailwork-infra.png)

### Descrição da arquitetura

O fluxo começa em um usuário ou sistema externo consumindo a API por HTTP. O **API Gateway HTTP API** recebe a chamada e encaminha para a Lambda `api`, que executa a aplicação NestJS.

Dentro da aplicação, o `ApiKeyGuard` valida o header `x-api-key`, busca a API key hasheada no banco e garante que o tenant e o provider estejam ativos. Depois disso, a rota correspondente executa a lógica de domínio.

Para endpoints de envio, a aplicação cria um `EmailJob` no Neon PostgreSQL e publica uma mensagem na `EmailQueue`, uma fila SQS. A Lambda `emailWorker` consome essa fila, busca o job no banco, resolve o provider ativo e envia o e-mail por SES ou SMTP.

Caso a mensagem falhe repetidamente, ela é redirecionada para a `EmailDeadLetterQueue`. O CloudWatch possui um alarme para detectar mensagens nessa DLQ.

### Componentes principais

| Camada | Componente | Responsabilidade |
|---|---|---|
| Cliente | Frontend / Client HTTP | Consome a API |
| API | API Gateway HTTP API | Entrada HTTP serverless |
| API | Lambda `api` | Executa a aplicação NestJS |
| Segurança | `ApiKeyGuard` | Valida API key, tenant e provider |
| Domínio | `EmailService` | Orquestra envio e criação de jobs |
| Domínio | `EmailJobsService` | Controla lifecycle do `EmailJob` |
| Domínio | `CampaignsService` | Calcula status agregado de campanhas |
| Domínio | `TwoFactorService` | Gera challenge 2FA e reutiliza pipeline de e-mail |
| Mensageria | `EmailQueue` | Fila SQS principal |
| Mensageria | `EmailDeadLetterQueue` | DLQ para falhas finais |
| Worker | Lambda `emailWorker` | Consome SQS e processa envios |
| Worker | `EmailWorkerService` | Envia e-mail, trata retry e idempotência |
| Persistência | Neon PostgreSQL | Guarda tenants, providers, templates, jobs e campaigns |
| Provider | Amazon SES | Envio de e-mails via AWS |
| Provider | SMTP externo | Provider alternativo via Nodemailer |
| Observabilidade | CloudWatch Alarm | Detecta mensagens na DLQ |

---

## Fluxo de execução dos endpoints robustos

A imagem abaixo representa a ordem temporal dos fluxos mais importantes da aplicação.

![alt text](public/flow-mailwork-endpoints.png)

### Endpoints destacados no fluxo

Os endpoints mais relevantes para demonstrar arquitetura backend são:

```text
POST /v1/emails/send
POST /v1/emails/send-template
POST /v1/emails/bulk
POST /v1/two-factor/send
GET  /v1/email-jobs/:id
GET  /v1/campaigns/:id
```

Esses endpoints mostram:

- criação de job assíncrono;
- renderização de template;
- envio em massa;
- reutilização do pipeline de e-mail para 2FA;
- consulta de status individual;
- consulta de status agregado de campanha.

---

## Como funciona o processamento assíncrono

### 1. Entrada HTTP

O cliente chama um endpoint protegido passando o header:

```http
x-api-key: <API_KEY_DO_TENANT>
```

A Lambda `api` recebe a requisição via API Gateway e executa a aplicação NestJS.

---

### 2. Validação de tenant e provider

O `ApiKeyGuard` executa a validação:

1. lê o header `x-api-key`;
2. aplica hash na API key;
3. busca a key no banco;
4. valida se a API key está ativa;
5. valida se o tenant está ativo;
6. valida se o provider está ativo;
7. injeta o `AuthContext` na requisição.

O `AuthContext` contém:

```ts
{
  tenantId: string;
  apiKeyId: string;
  providerId: string;
  providerType: ProviderType;
}
```

Esse contexto garante que a operação seja executada sempre no escopo correto do tenant.

---

### 3. Criação do EmailJob

Para endpoints de envio, o `EmailService` cria um registro `EmailJob` com status inicial `PENDING`.

Exemplo conceitual:

```text
EmailJob
  tenantId
  providerId
  campaignId?
  to
  subject
  content
  status: PENDING
  attempts: 0
```

A API não tenta enviar o e-mail diretamente nesse momento.

---

### 4. Publicação no SQS

Depois de criar o job, o `SqsEmailQueuePublisher` publica uma mensagem na fila `EmailQueue`.

A mensagem contém metadados suficientes para a worker buscar e processar o job:

```ts
{
  jobId: string;
  tenantId: string;
  providerId: string;
  campaignId: string | null;
  correlationId: string;
  eventType: 'EMAIL_JOB_CREATED';
  createdAt: string;
}
```

Após a publicação, a API retorna para o cliente com status `202 Accepted`.

---

### 5. Processamento pela worker

A fila SQS aciona a Lambda `emailWorker`.

A worker:

1. lê o batch de mensagens;
2. faz parse do `EmailJobMessage`;
3. busca o `EmailJob` no banco;
4. ignora o job se ele já estiver `SENT`;
5. marca o job como `PROCESSING`;
6. busca o provider ativo do tenant;
7. instancia o provider correto via `EmailProviderFactory`;
8. envia o e-mail por SES ou SMTP;
9. atualiza o job para `SENT`, `FAILED` ou `FAILED_FINAL`;
10. se o job pertence a uma campanha, atualiza o status agregado da campanha.

---

### 6. Idempotência

O SQS possui semântica de entrega **at-least-once**, ou seja, uma mensagem pode ser entregue mais de uma vez.

Para reduzir risco de duplicidade, a worker verifica se o job já está `SENT`. Caso esteja, ela ignora o processamento.

```text
Se EmailJob.status == SENT:
  não envia novamente
```

Essa é a barreira de idempotência atual do sistema.

---

### 7. Retry, falha parcial e DLQ

A Lambda worker usa resposta parcial de lote SQS. Isso significa que, se um item do batch falhar, apenas aquele item volta para retry.

Depois de falhas repetidas, a mensagem é movida para a `EmailDeadLetterQueue`.

```text
EmailQueue
  -> retry
  -> retry
  -> retry
  -> EmailDeadLetterQueue
  -> CloudWatch Alarm
```

---

## Multi-tenancy e autenticação

O sistema é multi-tenant desde a autenticação até a persistência dos dados.

Cada tenant possui:

- API keys;
- providers de e-mail;
- templates;
- jobs;
- campanhas;
- challenges 2FA.

A autenticação não usa JWT. O consumidor da API envia uma API key no header `x-api-key`.

A API key nunca é armazenada em texto puro. O sistema armazena apenas:

- prefixo da key;
- hash da key;
- status ativo/revogado;
- tenant relacionado;
- provider relacionado.

Isso permite que cada chamada seja vinculada a um tenant e a um provider específico.

---

## Modelagem de dados

Principais models do Prisma:

```text
Tenant
TenantEmailProvider
TenantApiKey
EmailTemplate
EmailCampaign
EmailJob
TwoFactorChallenge
```

### Tenant

Representa um cliente/organização usando a API.

### TenantEmailProvider

Representa o provider de e-mail configurado para um tenant.

Pode conter configuração para:

- SES;
- SMTP.

### TenantApiKey

Representa uma API key associada a um tenant e provider.

A API key é usada para autenticar chamadas externas.

### EmailTemplate

Templates HTML reutilizáveis por tenant.

Usado em:

```text
POST /v1/emails/send-template
POST /v1/emails/bulk
```

### EmailCampaign

Representa um envio em massa.

Guarda:

- tenant;
- nome;
- subject;
- total de destinatários;
- status agregado;
- data de conclusão.

### EmailJob

Entidade central do processamento.

Cada e-mail individual vira um `EmailJob`.

Status possíveis:

```text
PENDING
PROCESSING
SENT
FAILED
FAILED_FINAL
```

### TwoFactorChallenge

Guarda o desafio 2FA.

O código é salvo hasheado, e não em texto puro.

---

## Endpoints principais

Todas as rotas usam o prefixo `/v1`.

Exceto `GET /v1/health` e `POST /v1/dev/bootstrap`, as rotas exigem:

```http
x-api-key: <API_KEY>
```

---

### Health

```http
GET /v1/health
```

Verifica se a API está online.

---

### Dev bootstrap

```http
POST /v1/dev/bootstrap
```

Cria dados iniciais de desenvolvimento.

Essa rota é desativada em produção.

O seed também cria:

- tenant de desenvolvimento;
- provider;
- API key;
- template `welcome`.

---

### Providers

```http
POST  /v1/providers
GET   /v1/providers
PATCH /v1/providers/:id/activate
PATCH /v1/providers/:id/deactivate
```

Gerencia providers de e-mail de um tenant.

---

### Templates

```http
POST   /v1/templates
GET    /v1/templates
GET    /v1/templates/:id
PATCH  /v1/templates/:id
DELETE /v1/templates/:id
```

Gerencia templates de e-mail por tenant.

---

### Envio unitário

```http
POST /v1/emails/send
```

Cria um `EmailJob` e publica a mensagem na fila SQS.

Fluxo:

```text
Request
  -> valida API key
  -> cria EmailJob PENDING
  -> publica jobId no SQS
  -> retorna 202 Accepted
  -> worker envia depois
```

---

### Envio por template

```http
POST /v1/emails/send-template
```

Busca um template do tenant, renderiza variáveis e cria um `EmailJob`.

Fluxo:

```text
Request
  -> valida API key
  -> busca EmailTemplate
  -> renderiza subject/html
  -> cria EmailJob PENDING
  -> publica jobId no SQS
  -> retorna 202 Accepted
```

---

### Envio em massa

```http
POST /v1/emails/bulk
```

Cria uma `EmailCampaign` e um `EmailJob` para cada destinatário.

Fluxo:

```text
Request
  -> valida API key
  -> cria EmailCampaign
  -> para cada recipient:
       cria EmailJob
       publica jobId no SQS
  -> retorna campaignId
```

Esse endpoint é um dos mais importantes do projeto, porque mostra a modelagem de campanha, jobs individuais, processamento assíncrono e status agregado.

---

### Consulta de job

```http
GET /v1/email-jobs/:id
```

Consulta o status de um job individual.

A consulta é filtrada por tenant, então um tenant não consegue acessar jobs de outro tenant.

---

### Consulta de campanha

```http
GET /v1/campaigns/:id
```

Consulta o status agregado de uma campanha.

A resposta contém resumo dos jobs:

```text
pending
processing
sent
failed
```

---

### Two-factor

```http
POST /v1/two-factor/send
POST /v1/two-factor/verify
```

O envio de 2FA reutiliza o pipeline assíncrono de e-mail.

Fluxo do envio:

```text
Request
  -> valida API key
  -> gera código
  -> salva hash no TwoFactorChallenge
  -> cria EmailJob
  -> publica no SQS
  -> retorna 202 Accepted
```

Fluxo da verificação:

```text
Request
  -> valida API key
  -> busca challenge válido
  -> compara hash
  -> marca consumedAt
  -> retorna valid true/false
```

---

## Variáveis de ambiente

Crie um arquivo `.env` com base no `.env.example`.

Exemplo:

```env
# App
NODE_ENV=development
PORT=3000

# Neon PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@ep-example-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@ep-example.REGION.aws.neon.tech/neondb?sslmode=require"

# AWS
AWS_REGION=us-east-1
AWS_PROFILE=default
AWS_SQS_EMAIL_QUEUE_URL=
AWS_SES_FROM_EMAIL=verified@example.com
AWS_SES_FROM_NAME=MailWorks

# Email processing
EMAIL_WORKER_MAX_RECEIVE_COUNT=5

# 2FA
TWO_FACTOR_TTL_SECONDS=1800

# Dev bootstrap
DEV_TENANT_NAME=Dev Tenant
DEV_PROVIDER_TYPE=SES
DEV_API_KEY_NAME=Local Dev Key

# Optional SMTP provider
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=user@example.com
SMTP_PASS=app-password
```

### DATABASE_URL vs DIRECT_URL

O projeto usa duas URLs para o mesmo banco Neon:

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Runtime da API e Lambdas. Deve ser a URL pooled, com `-pooler` no hostname. |
| `DIRECT_URL` | Prisma CLI, migrations, introspection e administração. Não deve ser enviada às Lambdas. |

---

## Como rodar localmente

### 1. Instalar dependências

```bash
npm install
```

---

### 2. Configurar ambiente

Copie o `.env.example` para `.env`:

```bash
cp .env.example .env
```

Preencha:

- `DATABASE_URL`;
- `DIRECT_URL`;
- `AWS_REGION`;
- `AWS_SQS_EMAIL_QUEUE_URL`, se for publicar mensagens em uma fila real;
- `AWS_SES_FROM_EMAIL`;
- `AWS_SES_FROM_NAME`.

---

### 3. Aplicar migrations

Para aplicar as migrations existentes:

```bash
npx prisma migrate deploy
```

Para criar novas migrations em ambiente de desenvolvimento isolado:

```bash
npx prisma migrate dev
```

---

### 4. Gerar Prisma Client

```bash
npx prisma generate
```

---

### 5. Rodar seed

```bash
npx prisma db seed
```

O seed imprime uma API key raw uma única vez. Use essa key no header `x-api-key`.

---

### 6. Rodar a aplicação NestJS localmente

```bash
npm run start:dev
```

A API sobe localmente usando o entrypoint tradicional NestJS.

---

### 7. Rodar PostgreSQL local opcional

O projeto usa Neon como banco padrão, mas possui um `docker-compose.yml` com PostgreSQL local como fallback.

```bash
docker compose up -d
```

Esse banco local sobe com:

```text
POSTGRES_USER=mailworks
POSTGRES_PASSWORD=mailworks
POSTGRES_DB=mailworks
PORT=5432
```

---

## Como validar o projeto

### Validar Prisma

```bash
npx prisma validate
```

### Gerar client

```bash
npx prisma generate
```

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Testes unitários

```bash
npm test -- --runInBand
```

### Testes e2e

```bash
npm run test:e2e -- --runInBand
```

### Validar resolução Serverless

```bash
npx serverless print --stage dev --region us-east-1
```

---

## Deploy na AWS

O deploy é feito com Serverless Framework.

```bash
npx serverless deploy --stage dev --region us-east-1
```

O `serverless.yml` provisiona:

- API Gateway HTTP API;
- Lambda `api`;
- Lambda `emailWorker`;
- SQS `EmailQueue`;
- SQS `EmailDeadLetterQueue`;
- Redrive policy;
- CloudWatch Alarm;
- permissões IAM;
- empacotamento com esbuild.

### Configuração da Lambda API

A função `api` executa a aplicação NestJS HTTP.

Configurações principais:

```text
handler: src/lambda/api.handler.handler
timeout: 30
reservedConcurrency: 2
events:
  - httpApi: '*'
```

### Configuração da Lambda Worker

A função `emailWorker` consome mensagens do SQS.

Configurações principais:

```text
handler: src/lambda/email-worker.handler.handler
timeout: 60
memorySize: 1024
reservedConcurrency: 5
batchSize: 10
maximumBatchingWindow: 5
functionResponseType: ReportBatchItemFailures
```

### Configuração da fila

A fila principal é a `EmailQueue`.

Configurações relevantes:

```text
VisibilityTimeout: 360
MessageRetentionPeriod: 345600
maxReceiveCount: 5
```

Depois de 5 falhas, a mensagem vai para a `EmailDeadLetterQueue`.

---

## Exemplos de uso

### Envio unitário

```bash
curl -X POST http://localhost:3000/v1/emails/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{
    "to": "cliente@example.com",
    "subject": "Bem-vindo ao MailWorks",
    "content": "<p>Olá, seja bem-vindo!</p>"
  }'
```

Resposta esperada:

```json
{
  "jobId": "uuid",
  "status": "PENDING",
  "queued": true
}
```

---

### Envio por template

```bash
curl -X POST http://localhost:3000/v1/emails/send-template \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{
    "templateId": "template-id",
    "to": "cliente@example.com",
    "variables": {
      "name": "Igor"
    }
  }'
```

---

### Envio em massa

```bash
curl -X POST http://localhost:3000/v1/emails/bulk \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{
    "name": "Campanha de boas-vindas",
    "subject": "Bem-vindo ao MailWorks",
    "content": "<p>Olá!</p>",
    "recipients": [
      { "email": "cliente1@example.com" },
      { "email": "cliente2@example.com" }
    ]
  }'
```

---

### Consultar job

```bash
curl -X GET http://localhost:3000/v1/email-jobs/<JOB_ID> \
  -H "x-api-key: <API_KEY>"
```

---

### Consultar campanha

```bash
curl -X GET http://localhost:3000/v1/campaigns/<CAMPAIGN_ID> \
  -H "x-api-key: <API_KEY>"
```

---

### Enviar 2FA

```bash
curl -X POST http://localhost:3000/v1/two-factor/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{
    "email": "cliente@example.com"
  }'
```

---

### Verificar 2FA

```bash
curl -X POST http://localhost:3000/v1/two-factor/verify \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{
    "email": "cliente@example.com",
    "code": "123456"
  }'
```

---

## Estrutura do projeto

```text
src/
  app.module.ts

  lambda/
    api.handler.ts
    email-worker.handler.ts

  aws/
    aws.module.ts
    email-queue.publisher.interface.ts
    sqs-email-queue.publisher.ts
    sqs-message.types.ts

  common/
    auth/
      api-key.guard.ts
      auth-context.decorator.ts
      auth-context.interface.ts
    utils/
      api-key.util.ts
      template-renderer.util.ts

  email/
    email.controller.ts
    email.service.ts
    dto/

  email-jobs/
    email-jobs.controller.ts
    email-jobs.service.ts

  campaigns/
    campaigns.controller.ts
    campaigns.service.ts

  templates/
    templates.controller.ts
    templates.service.ts

  providers/
    providers.controller.ts
    providers.service.ts
    email-provider.factory.ts
    ses/
    smtp/

  two-factor/
    two-factor.controller.ts
    two-factor.service.ts

  workers/
    workers.module.ts
    email-worker.service.ts

  prisma/
    prisma.module.ts
    prisma.service.ts

prisma/
  schema.prisma
  seed.ts
  migrations/

serverless.yml
docker-compose.yml
```

---

## Pontos de atenção e melhorias futuras

### 1. Transactional Outbox

Atualmente, o sistema cria o `EmailJob` no banco e depois publica no SQS. Existe uma janela de falha entre essas duas operações.

Uma melhoria arquitetural seria implementar **Transactional Outbox**:

```text
Transação no banco:
  -> cria EmailJob
  -> cria OutboxEvent

Publisher separado:
  -> lê OutboxEvent pendente
  -> publica no SQS
  -> marca evento como publicado
```

Isso reduz o risco de job persistido sem mensagem na fila.

---

### 2. Filas por prioridade

Hoje o mesmo pipeline processa envio comum, bulk e 2FA.

Uma evolução seria separar filas por criticidade:

```text
TwoFactorEmailQueue
TransactionalEmailQueue
BulkEmailQueue
```

Com isso, um envio em massa não prejudicaria a latência de um e-mail 2FA.

---

### 3. Rate limit por tenant/provider

Como o projeto é multi-tenant, seria útil controlar volume por tenant e provider:

```text
tenant A: limite X/min
tenant B: limite Y/min
provider SES: limite Z/min
```

Isso protege o sistema contra abuso e evita estouro de limite do provider.

---

### 4. Idempotency key na entrada HTTP

A worker já evita reprocessar jobs `SENT`, mas a entrada HTTP poderia aceitar uma `idempotencyKey`.

Isso ajudaria em casos onde o cliente repete a mesma requisição por timeout ou retry automático.

---

### 5. Observabilidade por correlationId

O payload SQS já possui `correlationId`.

Uma melhoria seria garantir que todos os logs usem esse ID:

```text
API log
SQS publish log
Worker log
Provider log
Campaign update log
```

Assim seria possível rastrear uma entrega ponta a ponta.

---

### 6. Alarmes adicionais

O projeto já possui alarme para DLQ, mas também seria interessante monitorar:

- tamanho da fila principal;
- idade da mensagem mais antiga;
- taxa de falha por provider;
- taxa de jobs `FAILED_FINAL`;
- duração média da worker;
- volume por tenant.

---

### 7. Secrets Manager para credenciais sensíveis

Configs SMTP são persistidas em JSON no provider.

Uma evolução seria mover dados sensíveis para:

- AWS Secrets Manager;
- criptografia de campos sensíveis;
- rotação de credenciais.

---

## Resumo técnico

O MailWorks demonstra uma arquitetura backend orientada a eventos, com preocupação em:

- escalabilidade;
- desacoplamento;
- multi-tenancy;
- retry;
- DLQ;
- idempotência;
- status persistido;
- providers plugáveis;
- deploy serverless;
- observabilidade operacional.

A principal decisão arquitetural do projeto é tratar o envio de e-mail como um processo assíncrono e rastreável, em vez de executar todo o trabalho dentro da requisição HTTP.
