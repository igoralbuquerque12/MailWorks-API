# Validacao

## Comandos reais do projeto

Execute a partir da raiz do repositorio, usando npm.

| Objetivo | Comando existente | Observacao |
|---|---|---|
| Build/compilacao TypeScript | `npm run build` | E a verificacao de tipos disponivel; nao existe script `typecheck`. |
| Lint | `npm run lint` | O script usa `eslint ... --fix` e pode alterar arquivos. Revise o diff depois. |
| Testes unitarios | `npm test -- --runInBand` | Jest procura `src/**/*.spec.ts`. |
| Testes e2e | `npm run test:e2e -- --runInBand` | Usa `test/jest-e2e.json`; fluxos integrados podem exigir PostgreSQL e AWS. |
| Cobertura | `npm run test:cov -- --runInBand` | Use quando a tarefa alterar comportamento relevante. |
| Formatacao | `npm run format` | Modifica `src/**/*.ts` e `test/**/*.ts`; revise o diff. |
| Validar schema Prisma | `npx prisma validate` | CLI Prisma instalada no projeto. |
| Gerar Prisma Client | `npx prisma generate` | Necessario quando o schema mudar. |
| Seed local | `npx prisma db seed` | Altera banco local; execute apenas quando fizer parte da spec. |

Infraestrutura local disponivel: `docker compose up -d postgres` sobe o PostgreSQL definido em `docker-compose.yml`. Nao derrube nem apague volumes sem autorizacao.

## Matriz obrigatoria por impacto

- Somente documentacao/agentes: confirme links, caminhos e comandos; execute `git diff --check`. Nao e obrigatorio executar build/testes se nenhum arquivo de produto/configuracao mudou.
- TypeScript sem mudanca externa: `npm run lint`, `npm run build`, `npm test -- --runInBand`.
- Endpoint, modulo ou fluxo integrado: adicione `npm run test:e2e -- --runInBand`.
- Prisma/schema/seed: adicione `npx prisma validate`, `npx prisma generate` e testes afetados. Migracao/seed somente se previstos na spec.
- Fila SQS, Lambda, worker, SES ou SMTP: valide build, testes unitarios, e2e e `npx serverless print` com variaveis placeholder; descreva qualquer dependencia externa nao exercitada.

## Baseline conhecido em 6 de junho de 2026

- PASSA: `npx prisma validate`.
- PASSA: `npm run build`.
- PASSA: `npm test -- --runInBand` com 15 testes.
- PASSA: `npm run test:e2e -- --runInBand`.
- `npx serverless print` exige `DATABASE_URL` e `AWS_SES_FROM_EMAIL`; use placeholders temporarios somente para validar resolucao local.

## Regras de execucao

- Nao invente scripts. Se uma validacao necessaria nao existir, registre a lacuna e proponha sua criacao na spec.
- Como `lint` e `format` modificam arquivos, execute-os perto do fim e revise `git diff` para evitar mudancas fora do escopo.
- Nao use credenciais reais em testes.
- Registre comandos executados, resultado, falhas conhecidas e validacoes nao executadas no `EXIT.md`.
