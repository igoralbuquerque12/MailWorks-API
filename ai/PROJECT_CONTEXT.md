# Contexto do projeto

## Proposito

MailWorks e uma API de entrega de e-mails multi-tenant orientada a eventos na AWS. A API autentica tenants por API key hasheada, persiste jobs no Neon PostgreSQL, publica no SQS e delega o envio real a uma Lambda worker que usa SES ou SMTP.

Este repositorio contem um app NestJS com dois entrypoints Lambda: HTTP API e worker SQS.

## Stack atual

- Node.js, TypeScript, NestJS 11 e Express.
- Prisma 6 com Neon PostgreSQL.
- AWS SDK v3 para SQS e SES.
- Lambda, API Gateway HTTP API, SQS, DLQ e CloudWatch via Serverless Framework 3.
- Nodemailer para provider SMTP alternativo.
- Jest, Supertest, ESLint e Prettier.
- Neon e o banco padrao; Docker Compose com PostgreSQL permanece como fallback local opcional.

## Fluxos implementados

- Health em `GET /v1/health`.
- Bootstrap dev em `POST /v1/dev/bootstrap`, bloqueado em producao.
- Providers e templates por tenant.
- Envio unitario, por template e bulk em `/v1/emails`.
- Consulta tenant-scoped de jobs e campaigns.
- 2FA persistido no PostgreSQL e entregue pelo mesmo pipeline SQS.
- Worker idempotente para jobs ja `SENT`, com falha parcial de lote SQS.

## Variaveis de ambiente

Veja `.env.example`. `DATABASE_URL` deve ser a URL Neon pooled usada pelo runtime/Lambdas. `DIRECT_URL` deve ser a URL Neon direct usada apenas pelo Prisma CLI para migrations e ferramentas administrativas. O `serverless-dotenv-plugin` possui allowlist e nao envia `DIRECT_URL` as Lambdas.

## Baseline atualizado em 7 de junho de 2026

- `npx prisma validate`: passa.
- `npx prisma generate`: passa.
- `npm run build`: passa.
- `npm test -- --runInBand`: passa com 15 testes.
- `npm run test:e2e -- --runInBand`: passa.
- `npx serverless print` com `DATABASE_URL` Neon placeholder: passa.
- Bull, Redis e ioredis foram removidos.
- Migration inicial AWS event-driven versionada em `prisma/migrations/`.

## Pendencias conhecidas

- Credenciais SMTP persistidas em JSON devem migrar para Secrets Manager/criptografia.
- Publicacao SQS e persistencia PostgreSQL ainda nao usam transactional outbox.
- O pooler do Neon reduz a pressao de conexoes das Lambdas, mas limites do plano, concorrencia e cold starts ainda precisam ser monitorados.
- Prisma 6 aceita `directUrl` no schema; a futura atualizacao para Prisma 7 exigira avaliar migracao para `prisma.config.ts`.
- SES sandbox e configuracao AWS real nao sao exercitados pelos testes locais.
- O bulk demo publica sequencialmente e limita 1000 destinatarios.
