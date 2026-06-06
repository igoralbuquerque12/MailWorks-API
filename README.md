# MailWorks AWS Event-Driven Email Delivery API

API multi-tenant de entrega de e-mails construída com NestJS, PostgreSQL e uma arquitetura orientada a eventos na AWS.

```text
Client -> API Gateway -> NestJS Lambda -> PostgreSQL -> SQS
                                                   -> Lambda worker
                                                   -> SES ou SMTP
Falhas repetidas -> SQS DLQ -> CloudWatch Alarm
```

## Stack

- NestJS 11, TypeScript e Prisma/PostgreSQL
- AWS SQS, Lambda, SES e CloudWatch
- Serverless Framework 3
- Jest, ESLint e Prettier

## Endpoints principais

Todas as rotas usam o prefixo `/v1`. Exceto health e bootstrap dev, envie `x-api-key`.

- `GET /v1/health`
- `POST /v1/dev/bootstrap` somente fora de produção
- `POST /v1/emails/send`
- `POST /v1/emails/send-template`
- `POST /v1/emails/bulk`
- `GET /v1/email-jobs/:id`
- `GET /v1/campaigns/:id`
- CRUD em `/v1/providers` e `/v1/templates`
- `POST /v1/two-factor/send` e `/v1/two-factor/verify`

## Rodar localmente

```bash
npm install
docker compose up -d postgres
npx prisma migrate dev
npx prisma generate
npx prisma db seed
npm run start:dev
```

Configure `.env` a partir de `.env.example`. Para publicar mensagens é necessário informar `AWS_SQS_EMAIL_QUEUE_URL`. O seed imprime uma API key raw uma única vez.

## Validar

```bash
npx prisma validate
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

## Deploy AWS

```bash
npx serverless deploy --stage dev --region us-east-1
```

O `serverless.yml` cria API HTTP, fila SQS, DLQ, Lambda worker, IAM mínimo e alarme CloudWatch. Defina `DATABASE_URL`, `AWS_SES_FROM_EMAIL` e `AWS_SES_FROM_NAME` antes do deploy.

Leia o guia completo: [docs/AWS_EVENT_DRIVEN_GUIDE.md](docs/AWS_EVENT_DRIVEN_GUIDE.md).

## Limitações

- SES sandbox exige remetentes e destinatários verificados.
- Postgres para Lambda em produção exige estratégia de conexão, como RDS Proxy.
- O envio bulk de demonstração aceita no máximo 1000 destinatários por request.
- Credenciais SMTP ainda ficam em JSON no banco; produção deve usar Secrets Manager e criptografia.
- Ainda não há rate limiting, webhooks de bounce/complaint ou outbox transacional.
