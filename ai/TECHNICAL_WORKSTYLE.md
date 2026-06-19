# Estilo tecnico de trabalho

## Antes de editar

1. Leia a spec ativa e os documentos obrigatorios apontados por `AGENTS.md`.
2. Inspecione `git status`, arquivos afetados, testes proximos e contratos relacionados.
3. Compare documentacao com o codigo. Em divergencias, o codigo executavel e o schema atual sao a evidencia primaria; registre a divergencia.
4. Identifique impacto em HTTP, Prisma, SQS/DLQ, Lambda, SES/SMTP, multi-tenancy e documentacao.
5. Atualize a spec com plano, riscos e criterios de aceite antes da implementacao.

## Convencoes observadas

- Organize codigo por modulo/dominio NestJS, com `*.module.ts`, controllers, services, DTOs e providers proximos.
- Use injecao de dependencia do NestJS. `PrismaService` e global; nao instancie `PrismaClient` dentro do app. A excecao atual e `prisma/seed.ts`.
- Use aliases absolutos `src/...` quando esse for o padrao dos arquivos vizinhos.
- DTOs HTTP usam `class-validator`; mantenha o `ValidationPipe` global em mente.
- Interfaces de provider ficam em `src/common/interfaces/`; providers concretos ficam em `src/providers/<provider>/`.
- O contrato de provider e `IEmailProvider.send(EmailPayload): Promise<void>`.
- O envio HTTP deve continuar assincrono: persistir job, publicar no SQS e responder 202. O envio externo pertence ao `EmailWorkerService`.
- Mantenha o vinculo `tenantId`/`providerId` ao criar e processar jobs. Nunca introduza consulta cross-tenant sem filtro ou vinculo verificavel.
- Use `Logger` do NestJS para eventos operacionais e erros; nao registre segredos, API keys, codigos 2FA ou credenciais.
- Use excecoes NestJS apropriadas para falhas HTTP. Nao esconda falhas que mudem o contrato sem decisao registrada.
- Siga Prettier: aspas simples e trailing commas. Observe que a formatacao existente ainda e inconsistente em alguns arquivos.
- Nao adicione abstracao ou dependencia sem necessidade demonstrada na spec.

## Regras para mudancas sensiveis

- Prisma/Neon: alinhe schema, Prisma Client, seed, queries, relacoes e eventual migracao. Use `DATABASE_URL` pooled no runtime e `DIRECT_URL` direct no Prisma CLI. Nao assuma que o schema atual valida.
- Filas: preserve a porta `EmailQueuePublisher`; documente payload SQS, retry/DLQ, idempotencia, transicoes de status e tratamento de falhas.
- 2FA: persista apenas hash no PostgreSQL e documente TTL, uso unico e comportamento em indisponibilidade.
- Providers externos: mantenha o factory e o contrato comum; documente configuracao, erros e dados sensiveis.
- Endpoints: preserve ou explicite mudancas de status HTTP, headers, DTOs, resposta, autenticacao e erros.
- Seguranca: nunca commite `.env`, chaves reais, senhas SMTP ou valores de producao.

## Documentacao no codigo

Adicione JSDoc em funcoes/metodos publicos, regras de negocio complexas e integracoes externas quando criar ou alterar esses contratos. O JSDoc deve explicar proposito, invariantes, efeitos colaterais e erros relevantes, sem repetir a assinatura.

## Escopo e qualidade

- Faça alteracoes pequenas e coerentes com a spec.
- Nao corrija pendencias conhecidas sem relacao com a tarefa.
- Nao reverta alteracoes preexistentes do usuario.
- Adicione ou atualize testes proporcionais ao risco.
- Ao descobrir fato novo sobre o projeto, atualize o documento `ai/` correspondente na mesma tarefa.
