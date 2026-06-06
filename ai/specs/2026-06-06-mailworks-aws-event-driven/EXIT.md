# EXIT - MailWorks AWS Event-Driven

## Entendimento

A tarefa transformou o backend NestJS existente em uma API de entrega de e-mails multi-tenant orientada a eventos na AWS. O fluxo HTTP agora autentica tenant/provider, persiste jobs no PostgreSQL e publica no SQS; uma Lambda worker separada processa as mensagens e envia por SES ou SMTP.

## Plano seguido

1. Registrar baseline e copiar a spec para a pasta de execução.
2. Remover Bull/Redis e alinhar dependências.
3. Corrigir e expandir schema Prisma, migration e seed.
4. Implementar API key segura e contexto multi-tenant.
5. Implementar porta SQS, provider SES, worker e handlers Lambda.
6. Implementar templates, bulk/campaigns, consultas de status, providers e 2FA.
7. Criar infraestrutura Serverless, testes e documentação.
8. Validar, empacotar, commitar, fazer push e abrir PR draft.

## Alterações por área

### Infra

- Criado `serverless.yml` com HTTP API, Lambda worker, SQS, DLQ, redrive policy, partial batch response, IAM e alarme CloudWatch.
- Removidos Bull, Redis, ioredis e serviço Redis do Docker Compose.
- Adicionada allowlist do `serverless-dotenv-plugin` para impedir vazamento de variáveis não relacionadas.
- Adicionado prune seguro do pacote Lambda em `scripts/prune-lambda-package.cjs`.
- Bundles finais validados:
  - API: aproximadamente 41,90 MB compactado / 106,98 MB descompactado.
  - Worker: aproximadamente 41,82 MB compactado / 106,59 MB descompactado.

### Banco de dados

- Corrigido `TenantApiKey` com `tenantId`, `keyPrefix`, `keyHash`, relações e índices.
- Adicionados `EmailTemplate`, `EmailCampaign` e `TwoFactorChallenge`.
- Expandido `EmailJob` com campanha, `messageId`, `updatedAt` e `FAILED_FINAL`.
- Criada migration `20260606175830_aws_event_driven_refactor`.
- Refatorado seed para provider SES/SMTP, template e API key hasheada.
- Prisma Client configurado com engine Lambda `rhel-openssl-3.0.x`.

### Server/API

- Prefixo global `/v1` e health em `/v1/health`.
- Guard de API key valida hash, key, tenant e provider ativos e injeta `AuthContext`.
- Criados endpoints de bootstrap dev, providers, templates, envio unitário/template/bulk, jobs, campaigns e 2FA.
- Consultas e mutações são filtradas pelo tenant autenticado.
- Respostas de provider SMTP redigem o campo `pass`.

### Worker

- Criados Lambda handler SQS com partial batch response e `EmailWorkerService`.
- Implementadas transições `PENDING/FAILED -> PROCESSING -> SENT` e falha final baseada em `ApproximateReceiveCount`.
- Jobs já `SENT` são ignorados para reduzir reenvio em entrega pelo menos uma vez.
- Campaign status é recalculado após processamento.

### Providers

- Mantido SMTP com retorno de `messageId`.
- Criado provider Amazon SES com AWS SDK v3.
- Factory valida configurações mínimas e aceita somente adapters implementados.

### Docs

- README boilerplate substituído.
- Criado `docs/AWS_EVENT_DRIVEN_GUIDE.md`.
- Criada e atualizada estrutura `AGENTS.md` + `ai/`.
- Documentados arquitetura, deploy, SES sandbox, DLQ, CloudWatch, trade-offs e fala de entrevista.

### Testes

- Criados testes para `ApiKeyGuard`, `EmailService`, `EmailWorkerService`, renderer de templates e `TwoFactorService`.
- Corrigidos teste do health e e2e antigos.
- Resultado final: 15 testes unitários e 1 teste e2e passando.

## Decisões técnicas

- Serverless Framework foi fixado na versão 3 porque `serverless-dotenv-plugin` não suporta Serverless 4 e `serverless-offline` 13 é compatível com Serverless 3.
- Os arquivos exigidos `api.handler.ts` e `email-worker.handler.ts` usam handlers `...handler.handler` no Serverless, pois o último ponto separa arquivo e função.
- O publisher SQS resolve a URL somente no momento da publicação, permitindo iniciar o app e testar health sem fila configurada.
- O schema mantém PostgreSQL e usa SQS/Lambda/SES como camada AWS.
- O bundle externaliza Prisma Client e inclui explicitamente o client gerado/engine Linux, removendo ferramentas de desenvolvimento do ZIP.

## Não concluído / limitações

- Deploy AWS real não foi executado.
- Envio real por SES/SMTP e redrive real para DLQ não foram exercitados.
- Postgres e SQS ainda não possuem transactional outbox.
- Produção com Lambda/Postgres deve considerar RDS Proxy e rede/VPC.
- Credenciais SMTP persistidas devem evoluir para Secrets Manager/criptografia em repouso.
- Bulk publica sequencialmente e limita 1000 destinatários.
- `npm audit --omit=dev` está limpo; o audit completo ainda informa 11 vulnerabilidades em dependências de desenvolvimento, principalmente da cadeia Serverless.
- O arquivo preexistente não rastreado `repomix-output.xml` permaneceu fora do commit.

## Documentação

Documentação atualizada: sim.

- `README.md`
- `docs/AWS_EVENT_DRIVEN_GUIDE.md`
- `AGENTS.md`
- documentos e playbooks em `ai/`

## Comandos executados e resultados

| Comando | Resultado |
|---|---|
| `npm install` | Passou. |
| `npx prisma format` | Passou. |
| `npx prisma validate` | Passou. |
| `npx prisma generate` | Passou. |
| `npx prisma migrate status` com PostgreSQL local | Passou; schema atualizado. |
| `npx prisma db seed` com PostgreSQL local | Passou. |
| `npm run build` | Passou. |
| `npm run lint` | Passou sem warnings finais. |
| `npm test -- --runInBand` | Passou; 6 suites, 15 testes. |
| `npm run test:e2e -- --runInBand` | Passou; 1 suite, 1 teste. |
| `docker compose config --quiet` | Passou. |
| `npx serverless print --stage dev --region us-east-1` com placeholders | Passou. |
| `npx serverless package --stage dev --region us-east-1` com placeholders | Passou. |
| `npm audit --omit=dev` | Passou; 0 vulnerabilidades de produção. |
| Busca por segredos e referências Bull/Redis | Passou; nenhuma referência de produto ou segredo encontrado. |

## Git e Pull Request

- Branch: `feat/aws-event-driven-mailworks`
- Commit principal: `158c39c` - `feat(aws): refactor mail delivery to event-driven architecture`
- Push: concluído para `origin/feat/aws-event-driven-mailworks`
- Pull Request draft: https://github.com/igoralbuquerque12/MailWorks-API/pull/4
- Base do PR: `main`
