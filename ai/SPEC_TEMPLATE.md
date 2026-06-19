# SPEC NNNN - Titulo da tarefa

> Copie este template para `ai/specs/NNNN-slug/SPEC.md`. Mantenha `EXIT.md` na mesma pasta ao concluir.

## Metadados

- Status: rascunho | aprovada | em andamento | concluida | bloqueada
- Responsavel:
- Criada em:
- Atualizada em:
- Branch:
- Issue/ticket:
- Playbook principal: `ai/skills/<playbook>.md`

## Contexto e problema

Descreva o comportamento atual observado, a necessidade e as evidencias no repositorio. Aponte divergencias entre codigo e documentacao.

## Objetivo

Defina o resultado verificavel da tarefa.

## Escopo

### Incluido

-

### Fora de escopo

-

## Hipoteses e pendencias

- Hipotese:
- Pendencia:
- Pergunta em aberto:

## Investigacao

- Arquivos e modulos relevantes:
- Fluxo atual:
- Contratos afetados:
- Dependencias externas:
- Baseline de validacao:

## Decisoes tecnicas

Registre decisoes, alternativas consideradas e motivos. Inclua impacto em multi-tenancy, Prisma, SQS/DLQ, Lambda, providers e compatibilidade quando aplicavel.

## Plano de implementacao

1.
2.
3.

## Mudancas de contrato

### HTTP/API

- Rotas, headers, DTOs, status, respostas e erros:

### Dados/Prisma

- Models, enums, relacoes, seed e migracao:

### Filas/workers

- Nome, payload, retry/backoff, idempotencia e estados:

### Integracoes/configuracao

- Variaveis de ambiente, providers e falhas:

## Documentacao a atualizar

- [ ] `ai/PROJECT_CONTEXT.md`, se o contexto/baseline mudar
- [ ] `ai/ARCHITECTURE.md`, se arquitetura/fluxo mudar
- [ ] `ai/VALIDATION.md`, se comandos/baseline mudar
- [ ] `README.md` e/ou `.env.example`, se setup/uso mudar
- [ ] JSDoc/documentacao equivalente para contratos publicos, regras complexas e integracoes

## Estrategia de testes e validacao

Liste apenas comandos reais de `ai/VALIDATION.md`, testes a criar/alterar, dependencias de infraestrutura e resultado esperado.

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm test -- --runInBand`
- [ ] `npm run test:e2e -- --runInBand`, se aplicavel
- [ ] `npx prisma validate`, se aplicavel
- [ ] Outras validacoes existentes e justificadas:

## Criterios de aceite

- [ ]
- [ ]

## Riscos, rollout e rollback

- Riscos:
- Compatibilidade:
- Rollout:
- Rollback:

## Registro de execucao

Atualize durante a tarefa com descobertas, desvios e decisoes. Ao concluir, crie `EXIT.md` nesta pasta.
