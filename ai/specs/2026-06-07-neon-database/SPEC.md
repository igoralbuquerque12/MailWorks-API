# SPEC - Migracao da conexao PostgreSQL para Neon

## Metadados

- Status: concluida
- Responsavel: Codex
- Criada em: 2026-06-07
- Atualizada em: 2026-06-07
- Branch: `feat/aws-event-driven-mailworks`
- Issue/ticket: nao informado
- Playbook principal: `ai/skills/feature-implementation.md`

## Contexto e problema

O projeto usa Prisma 6 com o connector PostgreSQL e executa API e worker em AWS Lambda. O setup documentado ainda assume PostgreSQL local via Docker e recomenda RDS Proxy para producao. O objetivo desta tarefa e tornar Neon o banco gerenciado padrao, sem incluir credenciais reais.

Na investigacao inicial, `prisma/schema.prisma` continha duas alteracoes locais malformadas: o enum `ProviderType` perdeu sua abertura e o fim do arquivo recebeu uma relacao duplicada. Esses trechos impedem `prisma validate` e precisam ser reparados para concluir a configuracao.

## Objetivo

Configurar o projeto para usar Neon PostgreSQL com conexao pooled no runtime/Lambdas e conexao direta nas operacoes do Prisma CLI, deixando claro quais URLs o usuario deve preencher.

## Escopo

### Incluido

- Reparar os trechos malformados do schema Prisma sem mudar os models.
- Configurar `DIRECT_URL` no datasource Prisma 6.
- Atualizar `.env.example`, README, guia AWS e documentos de agentes.
- Preservar `DATABASE_URL` como a unica URL de banco enviada as Lambdas.
- Validar schema, client, build, lint, testes e resolucao Serverless.

### Fora de escopo

- Criar projeto/branch/role no painel Neon.
- Inserir credenciais ou URLs reais.
- Executar migration, seed ou deploy contra o Neon real.
- Adotar `@prisma/adapter-neon` ou alterar a implementacao do `PrismaService`.
- Remover o PostgreSQL Docker opcional.

## Hipoteses e pendencias

- Hipotese: o usuario fornecera duas URLs do mesmo banco/branch Neon, uma pooled e outra direct.
- Pendencia: executar `npx prisma migrate deploy` e seed depois que as URLs reais forem configuradas.
- Pendencia: validar conectividade AWS Lambda -> Neon em deploy real.

## Investigacao

- Arquivos relevantes: `prisma/schema.prisma`, `.env.example`, `serverless.yml`, `src/prisma/prisma.service.ts`, `README.md`, `docs/AWS_EVENT_DRIVEN_GUIDE.md`.
- Fluxo atual: `PrismaService` global atende API e worker; Serverless injeta somente `DATABASE_URL`.
- Contratos afetados: configuracao de conexao e operacao de migrations.
- Dependencias externas: Neon PostgreSQL e Prisma 6.
- Baseline inicial: schema Prisma invalido devido a alteracoes locais malformadas.

## Decisoes tecnicas

- Manter `provider = "postgresql"` porque Neon e PostgreSQL compativel.
- Usar `DATABASE_URL` pooled, com hostname Neon contendo `-pooler`, para trafego do app e das Lambdas.
- Usar `DIRECT_URL` sem `-pooler` para migrations, introspection e ferramentas administrativas.
- Configurar `directUrl = env("DIRECT_URL")` no schema, formato suportado pelo Prisma 6 instalado.
- Nao incluir `DIRECT_URL` em `serverless.yml`; migrations nao devem rodar dentro das Lambdas.
- Manter o Prisma Client atual, sem novo driver/adapter, para preservar arquitetura e escopo.

## Plano de implementacao

1. Criar spec e reparar/configurar o schema Prisma.
2. Atualizar exemplos de ambiente e documentacao operacional.
3. Atualizar contexto/arquitetura/validacao para refletir Neon.
4. Executar validacoes e criar `EXIT.md`.

## Mudancas de contrato

### HTTP/API

- Nenhuma.

### Dados/Prisma

- Nenhum model, enum ou dado muda.
- O datasource passa a exigir `DIRECT_URL` para comandos do Prisma CLI.

### Filas/workers

- Nenhuma mudanca de payload ou processamento.

### Integracoes/configuracao

- `DATABASE_URL`: conexao Neon pooled usada pelo runtime.
- `DIRECT_URL`: conexao Neon direct usada pelo Prisma CLI.

## Documentacao a atualizar

- [x] `ai/PROJECT_CONTEXT.md`
- [x] `ai/ARCHITECTURE.md`
- [x] `ai/VALIDATION.md`
- [x] `README.md` e `.env.example`
- [x] `docs/AWS_EVENT_DRIVEN_GUIDE.md`
- [x] JSDoc/documentacao equivalente: nao aplicavel; nenhum contrato TypeScript foi alterado.

## Estrategia de testes e validacao

- [x] `npx prisma format`
- [x] `npx prisma validate`
- [x] `npx prisma generate`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm test -- --runInBand`
- [x] `npm run test:e2e -- --runInBand`
- [x] `npx serverless print --stage dev --region us-east-1` com placeholders
- [x] `git diff --check`

## Criterios de aceite

- [x] Schema Prisma valido com URLs pooled/direct separadas.
- [x] Nenhuma URL ou credencial real versionada.
- [x] Setup e operacao Neon documentados.
- [x] `DIRECT_URL` nao exposta nas Lambdas.
- [x] Validacoes locais passam ou falhas ficam registradas.

## Riscos, rollout e rollback

- Riscos: URL pooled/direct invertida, credencial expirada ou branch Neon incorreto.
- Compatibilidade: models e migrations existentes permanecem PostgreSQL.
- Rollout: preencher `.env`, executar `prisma migrate deploy`, gerar client, seed opcional e deploy Serverless.
- Rollback: restaurar URLs do PostgreSQL anterior; nenhuma migration nova e necessaria.

## Registro de execucao

- A documentacao oficial Neon/Prisma recomenda conexao pooled para runtime serverless e conexao direct para migrations.
- O schema malformado sera reparado somente nos trechos que divergem do schema versionado.
- O schema foi reparado e o diff final em `prisma/schema.prisma` altera somente o datasource para adicionar `DIRECT_URL`.
- Prisma CLI efetivamente instalado: 6.19.3. O aviso sobre `prisma.config.ts` foi registrado como pendencia futura para Prisma 7.
