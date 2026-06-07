# EXIT - Configuracao Neon PostgreSQL

## Entrega

O projeto agora usa Neon como PostgreSQL gerenciado padrao. O Prisma 6 foi configurado com conexoes separadas:

- `DATABASE_URL`: endpoint pooled do Neon para API e worker Lambda;
- `DIRECT_URL`: endpoint direct do mesmo branch para Prisma CLI, migrations e administracao.

Nenhuma URL real foi inserida. `DIRECT_URL` permanece fora da allowlist do `serverless-dotenv-plugin` e nao e enviada as Lambdas.

## Alteracoes

- Reparados dois trechos locais malformados em `prisma/schema.prisma` que impediam a validacao.
- Adicionado `directUrl = env("DIRECT_URL")` sem alterar models, enums ou migrations.
- Atualizado `.env.example` com placeholders Neon pooled/direct.
- Atualizados README, guia AWS e documentos `ai/` para setup, operacao, arquitetura e validacao Neon.
- Mantido `docker-compose.yml` como fallback local opcional.

## Decisoes

- Mantido o connector Prisma `postgresql`, pois Neon e PostgreSQL compativel.
- Mantido o `PrismaService` global e o Prisma Client atual; nenhum driver ou adapter novo foi adicionado.
- `npx prisma migrate deploy` e o comando de primeiro provisionamento/aplicacao das migrations existentes.
- `npx prisma migrate dev` deve ser usado somente ao criar migrations em branch Neon de desenvolvimento isolado.

## Validacoes

| Comando | Resultado |
|---|---|
| `npx prisma format` | Passou. |
| `npx prisma validate` | Passou com URLs placeholder. |
| `npx prisma generate` | Passou; Prisma Client 6.19.3 gerado. |
| `npm run lint` | Passou. |
| `npm run build` | Passou. |
| `npm test -- --runInBand` | Passou; 6 suites e 15 testes. |
| `npm run test:e2e -- --runInBand` | Passou; 1 suite e 1 teste. |
| `npx serverless print --stage dev --region us-east-1` | Passou com placeholders; somente `DATABASE_URL` foi carregada. |
| `git diff --check` | Passou; apenas avisos de conversao LF/CRLF do Git no Windows. |

## Nao executado

- Conectividade, migrations, seed e deploy contra Neon real, pois as URLs serao informadas pelo usuario.
- Teste de carga/conexoes das Lambdas contra Neon.

## Riscos e pendencias

- `DATABASE_URL` e `DIRECT_URL` devem apontar para o mesmo branch/banco Neon e usar o mesmo role.
- A URL pooled deve conter `-pooler`; a direct nao deve conter.
- Monitorar concorrencia das Lambdas e limites do plano Neon.
- O Prisma CLI informa que `package.json#prisma` sera removido no Prisma 7; avaliar `prisma.config.ts` somente em uma futura atualizacao major.

## Git e Pull Request

- Branch: `feat/aws-event-driven-mailworks`
- Commit principal: `2b2a977` - `feat(database): configure Neon connections`
- Push: concluido para `origin/feat/aws-event-driven-mailworks`.
- Pull Request existente da branch: https://github.com/igoralbuquerque12/MailWorks-API/pull/4
- Alteracoes preexistentes fora do escopo foram preservadas e nao devem entrar no commit desta tarefa.
