# Arquitetura atual

## Visao geral

```text
HTTP -> API Gateway -> Lambda API NestJS -> PostgreSQL -> SQS
                                                    -> Lambda worker
                                                    -> SES ou SMTP
Falhas repetidas -> DLQ -> CloudWatch Alarm
```

## Fronteiras

- `src/lambda/api.handler.ts`: adapta HTTP API para NestJS/Express.
- `src/lambda/email-worker.handler.ts`: processa lote SQS com partial batch response.
- `src/aws/`: porta `EmailQueuePublisher` e adapter SQS.
- `src/workers/`: processamento idempotente e lifecycle de entrega.
- `src/providers/`: factory e adapters SES/SMTP.
- `src/common/auth/`: hash de API key, guard e `AuthContext`.
- `src/email/`, `templates/`, `campaigns/`, `email-jobs/`, `two-factor/`: dominios de aplicacao.
- `src/prisma/` e `prisma/`: persistencia e migrations.

## Fluxo de entrega

1. `ApiKeyGuard` hasheia `x-api-key`, valida key, tenant e provider ativos, e anexa `AuthContext`.
2. `EmailService` cria `EmailJob` `PENDING`.
3. A porta `EmailQueuePublisher` publica metadados e `jobId` no SQS.
4. A Lambda worker processa registros independentemente.
5. `EmailWorkerService` ignora job `SENT`, marca tentativa, resolve provider e envia.
6. Sucesso grava `SENT/messageId`; falha grava `FAILED` ou `FAILED_FINAL` e volta como falha parcial.
7. Jobs de campanha atualizam o agregado da campanha.

## Dados

Models Prisma: `Tenant`, `TenantEmailProvider`, `TenantApiKey`, `EmailTemplate`, `EmailCampaign`, `EmailJob` e `TwoFactorChallenge`.

API keys e desafios 2FA sao persistidos como SHA-256, nunca como valor raw nos respectivos models. O raw da API key so e mostrado no bootstrap/seed.

## Infraestrutura

`serverless.yml` cria API, worker, SQS, DLQ, redrive policy, alarme CloudWatch, IAM e outputs. A allowlist dotenv e uma restricao de seguranca obrigatoria.

## Trade-offs

- SQS entrega pelo menos uma vez; `SENT` e a barreira idempotente atual.
- Banco e fila nao compartilham transacao; transactional outbox e evolucao planejada.
- Lambda e Postgres exigem controle de concorrencia e conexoes em producao.

