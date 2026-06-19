# Playbook: investigacao do codebase

Use para tarefas desconhecidas, diagnosticos e preparacao de specs.

1. Leia `AGENTS.md` e os documentos `ai/` obrigatorios.
2. Inspecione `git status`, branch, manifests, scripts e arquivos afetados.
3. Mapeie o caminho ponta a ponta: controller -> service -> Prisma/SQS -> Lambda worker -> provider.
4. Busque testes, DTOs, enums, `.env.example`, schema/seed e documentacao relacionada.
5. Confirme fatos no codigo; registre divergencias e hipoteses.
6. Execute apenas validacoes de baseline necessarias para distinguir falha preexistente de regressao.
7. Crie ou atualize a spec com evidencias, contratos afetados, riscos e plano.

Saida minima: spec pronta para implementacao, com perguntas realmente bloqueantes destacadas. Nao altere produto durante uma investigacao pura.
