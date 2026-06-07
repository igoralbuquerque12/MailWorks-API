# MailWorks AWS Event-Driven Guide

## 1. O que este projeto faz

MailWorks recebe pedidos de envio de e-mail para múltiplos tenants. A API autentica cada cliente por API key, persiste um `EmailJob` auditável e publica uma mensagem no Amazon SQS. Uma Lambda separada consome a fila e entrega o e-mail por Amazon SES ou SMTP.

Também existem templates, campanhas bulk, consulta de status e 2FA. Todos esses fluxos reutilizam o mesmo pipeline assíncrono.

## 2. Problema original: envio síncrono e gargalo

Enviar e-mail no request HTTP prende o tempo de resposta à latência e disponibilidade do provider. Quando o provider fica lento, o cliente recebe timeout e pode repetir a chamada, aumentando o problema.

A versão anterior já usava Bull e Redis, mas API e worker viviam no mesmo processo NestJS e a infraestrutura exigia Redis próprio. O refactor move a fila para SQS e o consumidor para Lambda.

## 3. Arquitetura final

```text
Tenant
  -> API Gateway HTTP API
  -> Lambda API NestJS
  -> ApiKeyGuard: key hash + tenant/provider ativos
  -> Neon PostgreSQL: EmailJob PENDING
  -> Amazon SQS: mensagem com jobId
  -> Lambda emailWorker
  -> EmailProviderFactory
  -> Amazon SES ou SMTP
  -> Neon PostgreSQL: SENT, FAILED ou FAILED_FINAL

SQS excede maxReceiveCount -> DLQ -> CloudWatch Alarm
```

A API e o worker compartilham serviços de domínio, mas têm handlers Lambda independentes.

## 4. Por que SQS foi usado

SQS desacopla ingestão e processamento. A API responde rápido após persistir e publicar o job, enquanto a fila absorve picos e entrega mensagens ao ritmo suportado pelo worker/provider.

SQS oferece entrega pelo menos uma vez. Por isso, o worker verifica se o job já está `SENT` antes de enviar novamente.

## 5. O que é DLQ e como ela protege o sistema

A Dead Letter Queue recebe mensagens que falharam repetidamente. No `serverless.yml`, a fila principal usa `RedrivePolicy` com `maxReceiveCount: 5`.

Isso evita retry infinito, preserva a mensagem problemática para investigação e permite alarmar a equipe sem bloquear mensagens saudáveis.

## 6. Como Lambda consome SQS

O event source mapping da Lambda lê lotes da fila e chama `src/lambda/email-worker.handler.ts`. Cada registro contém atributos do SQS e um body com `jobId`, tenant, provider, campanha e correlation ID.

O handler reutiliza um application context NestJS entre invocações quentes. `EmailWorkerService` busca o job, resolve provider, envia e atualiza status.

## 7. O que é partial batch response

Sem partial batch response, uma mensagem ruim pode fazer o lote inteiro ser retentado. O handler processa cada registro individualmente e retorna:

```json
{
  "batchItemFailures": [
    { "itemIdentifier": "message-id-que-falhou" }
  ]
}
```

Somente os IDs retornados voltam à fila. Mensagens bem-sucedidas não são reprocessadas.

## 8. Como o Amazon SES entra no fluxo

`SesProvider` implementa o mesmo contrato `IEmailProvider` usado por SMTP. O factory escolhe o adapter pela configuração persistida do tenant.

O adapter SES usa AWS SDK v3 e a credential provider chain da AWS. Credenciais AWS não são persistidas no provider; somente região, remetente e nome são armazenados.

## 9. Como o Serverless Framework cria a infra

O `serverless.yml` declara:

- Lambda `api` conectada ao HTTP API;
- Lambda `emailWorker` conectada ao SQS;
- fila principal e DLQ;
- redrive policy;
- partial batch response;
- alarme CloudWatch quando a DLQ recebe mensagens;
- IAM mínimo para publicar/consumir SQS e enviar por SES;
- outputs com URLs e ARNs das filas.

O `serverless-dotenv-plugin` usa allowlist. Apenas `DATABASE_URL`, `AWS_SES_FROM_EMAIL` e `AWS_SES_FROM_NAME` podem ser carregadas do `.env`. A `DIRECT_URL`, usada pelo Prisma CLI, não é enviada às Lambdas.

O Prisma Client gera engines `native` e `rhel-openssl-3.0.x`. O pacote Lambda executa `scripts/prune-lambda-package.cjs` dentro da pasta temporária de build para excluir Prisma CLI, TypeScript e engines de desenvolvimento, respeitando o limite de tamanho da Lambda sem alterar o `node_modules` local.

## 10. Como configurar AWS localmente

Instale e autentique a AWS CLI:

```bash
aws configure --profile default
aws sts get-caller-identity
```

Preencha `.env` com a região, remetente SES e banco. Não commite `.env`, tokens ou credenciais.

Para o Neon, abra **Connect** no painel, selecione Prisma e copie duas URLs do mesmo branch:

- `DATABASE_URL`: conexão pooled, com `-pooler` no hostname, usada pelo app e pelas Lambdas;
- `DIRECT_URL`: conexão direct, sem `-pooler`, usada somente por migrations, introspection e ferramentas administrativas.

O `docker-compose.yml` continua disponível como fallback local opcional, mas não faz parte do setup padrão.

## 11. Como verificar e-mail/domínio no SES

No console AWS, abra Amazon SES na mesma região usada pelo projeto. Em **Verified identities**, crie uma identidade de e-mail ou domínio e conclua a verificação.

Em sandbox, remetentes e destinatários precisam estar verificados. Para produção, solicite saída do sandbox e configure DKIM/SPF no domínio.

## 12. Como subir a infraestrutura

```bash
npx serverless deploy --stage dev --region us-east-1
```

Ao final, anote o endpoint HTTP e o output `EmailQueueUrl`. Para remover a stack:

```bash
npx serverless remove --stage dev --region us-east-1
```

## 13. Como rodar migrations do Prisma

Com as URLs Neon configuradas no `.env`, use `migrate dev` apenas em um branch de desenvolvimento isolado:

```bash
npx prisma migrate dev
npx prisma generate
```

Em deploy automatizado ou no branch de produção, use `npx prisma migrate deploy`. Não execute `migrate dev` contra produção. O Prisma 6 usa `DIRECT_URL` para esses comandos; o runtime continua usando a `DATABASE_URL` pooled. A migration inicial deste refactor está em `prisma/migrations/`.

## 14. Como criar tenant/provider/API key de dev

Com banco migrado:

```bash
npx prisma db seed
```

O seed cria tenant, provider, template e API key hash. A API key raw é impressa apenas nessa execução.

Outra opção fora de produção:

```bash
curl -X POST http://localhost:3000/v1/dev/bootstrap
```

## 15. Como enviar um e-mail unitário

```bash
curl -X POST http://localhost:3000/v1/emails/send \
  -H "content-type: application/json" \
  -H "x-api-key: mw_dev_xxxxx" \
  -d '{"to":"verified@example.com","subject":"Teste","content":"<p>Ola</p>"}'
```

A resposta HTTP 202 contém `jobId`, status `PENDING` e `queued: true`.

## 16. Como enviar e-mail em massa

```bash
curl -X POST http://localhost:3000/v1/emails/bulk \
  -H "content-type: application/json" \
  -H "x-api-key: mw_dev_xxxxx" \
  -d '{"name":"Demo","recipients":["a@example.com","b@example.com"],"subject":"Novidade","content":"<p>Conteudo</p>"}'
```

O request cria uma campanha, um job por destinatário e publica cada job. O limite de demonstração é 1000 destinatários.

## 17. Como consultar status de job/campaign

```bash
curl http://localhost:3000/v1/email-jobs/<job-id> -H "x-api-key: mw_dev_xxxxx"
curl http://localhost:3000/v1/campaigns/<campaign-id> -H "x-api-key: mw_dev_xxxxx"
```

As consultas sempre filtram pelo tenant autenticado. Campanhas retornam totais pending, processing, sent e failed.

## 18. Como testar 2FA

```bash
curl -X POST http://localhost:3000/v1/two-factor/send \
  -H "content-type: application/json" -H "x-api-key: mw_dev_xxxxx" \
  -d '{"email":"verified@example.com"}'

curl -X POST http://localhost:3000/v1/two-factor/verify \
  -H "content-type: application/json" -H "x-api-key: mw_dev_xxxxx" \
  -d '{"email":"verified@example.com","code":"123456"}'
```

O challenge guarda somente hash, expiração e consumo. O conteúdo entregável do e-mail passa pelo `EmailJob`, como qualquer mensagem.

## 19. Como simular falha e ver DLQ

Configure temporariamente um remetente SES não verificado ou provider inválido. Envie um job e acompanhe os retries. Após cinco recebimentos, a mensagem deve aparecer na DLQ e o alarme deve entrar em estado de alerta.

Não faça esse teste em produção sem uma janela controlada.

## 20. Como olhar logs no CloudWatch

```bash
npx serverless logs -f api --stage dev --region us-east-1
npx serverless logs -f emailWorker --stage dev --region us-east-1
```

Os eventos importantes são JSON: `email_job_created`, `email_job_published_to_sqs`, `email_job_processing_started`, `email_job_sent`, `email_job_failed`, `email_job_already_sent`, `bulk_email_jobs_queued`, `two_factor_challenge_created` e `two_factor_verified`.

## 21. Como explicar esse projeto em entrevista

Eu parti de uma API de e-mails simples e refatorei para uma arquitetura orientada a eventos na AWS. A API autentica o tenant por API key, persiste um EmailJob no Postgres e publica uma mensagem no SQS. Uma Lambda worker consome a fila, resolve o provider pelo Factory/Strategy Pattern e envia via Amazon SES. Se houver erro, a mensagem é retentada automaticamente e, após o limite, vai para uma DLQ. Também deixei logs estruturados e alarmes no CloudWatch. A principal decisão foi tirar o envio do ciclo HTTP e modelar o processamento como pipeline assíncrono resiliente.

### Por que isso importa em sistemas financeiros/escala

- evita timeout no request HTTP;
- melhora resiliência contra provider instável;
- permite backpressure;
- permite auditoria por job;
- torna falhas observáveis;
- permite retry controlado;
- separa ingestão de processamento.

## 22. Trade-offs e melhorias futuras

Neon PostgreSQL mantém relações e auditoria simples e oferece um endpoint pooled adequado para o tráfego serverless. Ainda é necessário limitar a concorrência das Lambdas, acompanhar conexões e escolher capacidade/plano compatível com a carga.

A persistência do job e a publicação SQS não formam uma transação única. Uma evolução robusta é o transactional outbox. Outros próximos passos:

1. SNS para bounce/complaint do SES.
2. Rate limit por tenant.
3. S3 para CSV grande.
4. Step Functions para campanhas complexas.
5. DynamoDB para idempotência forte.
6. Secrets Manager para providers.
7. Dashboard de métricas.
8. Fallback multi-provider.

## 23. Comandos úteis

```bash
npm install
npx prisma format
npx prisma validate
npx prisma migrate dev
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
npm run start:dev
npm run build
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
npx serverless print --stage dev --region us-east-1
npx serverless deploy --stage dev --region us-east-1
npx serverless remove --stage dev --region us-east-1
```

## 24. Troubleshooting

**`AWS_SQS_EMAIL_QUEUE_URL` ausente:** faça deploy e use o output da stack, ou configure uma fila compatível para desenvolvimento.

**SES retorna identidade não verificada:** confirme região, remetente e estado sandbox.

**Muitas conexões no Neon:** confirme que `DATABASE_URL` usa o hostname com `-pooler`, reduza a concorrência reservada das Lambdas e monitore os limites do plano.

**Migration falha no Neon:** confirme que `DIRECT_URL` usa o hostname sem `-pooler` e aponta para o mesmo branch/banco de `DATABASE_URL`.

**Mensagem chegou à DLQ:** consulte logs estruturados pelo `jobId`, corrija provider/dados e faça redrive controlado.

**Serverless tenta carregar segredo indevido:** mantenha a allowlist em `custom.dotenv.include`; nunca remova essa proteção.

**Bulk muito grande:** use S3 e processamento paginado em vez de aumentar indefinidamente o limite HTTP.
