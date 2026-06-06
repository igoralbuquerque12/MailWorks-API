# Fluxo Git e Pull Request

## Antes de alterar

1. Execute `git status --short` e identifique alteracoes preexistentes.
2. Nao reverta, reformate ou inclua mudancas do usuario fora do escopo.
3. Confirme branch e spec ativa. O historico usa branches de ticket como `NOS-4008`; para tarefas sem convencao indicada, use `codex/<slug>`.
4. Registre na spec os arquivos e contratos esperados.

## Commits

- Quando possivel e autorizado pelo ambiente, conclua com commit.
- O historico usa Conventional Commits em ingles, por exemplo `feat(email): ...`, `fix(dependencies): ...` e `refactor(prisma): ...`.
- Preserve esse formato: `<tipo>(<escopo>): <resumo imperativo curto>`.
- Tipos usuais: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.
- Separe commits somente quando houver unidades coerentes e verificaveis.
- Antes do commit, revise `git diff`, `git status` e resultados de validacao.
- Nunca commite `.env`, credenciais, artefatos locais ou arquivos fora do escopo.

## Push e Pull Request

- Quando possivel, faça push da branch e abra Pull Request.
- Titulo, descricao e comunicacao do PR devem ser em portugues brasileiro, mantendo identificadores tecnicos em ingles.
- O PR deve incluir: contexto, mudancas, impactos de contrato/dados, validacoes executadas, falhas conhecidas, riscos e link/caminho da spec.
- Nao esconda testes falhando ou validacoes nao executadas.
- Nao faça merge automaticamente, salvo pedido explicito.

## EXIT.md obrigatorio

Ao final, crie `EXIT.md` na pasta da spec com:

- resumo do que foi entregue e do que ficou fora;
- arquivos/contratos alterados;
- decisoes, hipoteses e pendencias;
- comandos de validacao e resultados;
- riscos e follow-ups;
- hash/mensagem do commit, branch e estado do push;
- URL e estado do PR.

Se push ou PR nao forem possiveis por autenticacao, permissao, rede ou ferramenta ausente, registre o motivo exato no `EXIT.md`. Nao afirme que o PR foi aberto sem URL confirmada.

## Compatibilidade de specs

O formato preferido e `ai/specs/NNNN-slug/SPEC.md`, com `EXIT.md` ao lado. Se a tarefa vier em uma spec avulsa como `ai/specs/NNNN-slug.md`, crie `ai/specs/NNNN-slug/EXIT.md` e referencie a spec original nele.

