# Contexto do projeto

## Proposito

MailWorks e uma API de entrega de e-mails multi-tenant orientada a eventos na AWS. A API autentica tenants por API key hasheada, persiste jobs no PostgreSQL, publica no SQS e delega o envio real a uma Lambda worker que usa SES ou SMTP.

Este repositorio contem um app NestJS com dois entrypoints Lambda: HTTP API e worker SQS.

## Stack atual

- Node.js, TypeScript, NestJS 11 e Express.
- Prisma 6 com PostgreSQL.
- AWS SDK v3 para SQS e SES.
- Lambda, API Gateway HTTP API, SQS, DLQ e CloudWatch via Serverless Framework 3.
- Nodemailer para provider SMTP alternativo.
- Jest, Supertest, ESLint e Prettier.
- Docker Compose somente com PostgreSQL local.

## Fluxos implementados

- Health em `GET /v1/health`.
- Bootstrap dev em `POST /v1/dev/bootstrap`, bloqueado em producao.
- Providers e templates por tenant.
- Envio unitario, por template e bulk em `/v1/emails`.
- Consulta tenant-scoped de jobs e campaigns.
- 2FA persistido no PostgreSQL e entregue pelo mesmo pipeline SQS.
- Worker idempotente para jobs ja `SENT`, com falha parcial de lote SQS.

## Variaveis de ambiente

Veja `.env.example`. O `serverless-dotenv-plugin` possui allowlist para impedir que variaveis nao relacionadas sejam enviadas as Lambdas.

## Baseline atualizado em 6 de junho de 2026

- `npx prisma validate`: passa.
- `npx prisma generate`: passa.
- `npm run build`: passa.
- `npm test -- --runInBand`: passa com 15 testes.
- `npm run test:e2e -- --runInBand`: passa.
- Bull, Redis e ioredis foram removidos.
- Migration inicial AWS event-driven versionada em `prisma/migrations/`.

## Pendencias conhecidas

- Credenciais SMTP persistidas em JSON devem migrar para Secrets Manager/criptografia.
- Publicacao SQS e persistencia PostgreSQL ainda nao usam transactional outbox.
- Postgres em Lambda precisa de RDS Proxy/estrategia de conexoes para producao.
- SES sandbox e configuracao AWS real nao sao exercitados pelos testes locais.
- O bulk demo publica sequencialmente e limita 1000 destinatarios.

