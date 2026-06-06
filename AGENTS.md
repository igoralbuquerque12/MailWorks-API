# Instrucoes obrigatorias para agentes

Antes de planejar ou alterar qualquer arquivo, leia:

1. `ai/PROJECT_CONTEXT.md`
2. `ai/ARCHITECTURE.md`
3. `ai/TECHNICAL_WORKSTYLE.md`
4. `ai/VALIDATION.md`
5. `ai/DOCUMENTATION_RULES.md`
6. `ai/GIT_AND_PR_WORKFLOW.md`
7. o playbook aplicavel em `ai/skills/`

Regras obrigatorias:

- Investigue o codigo real; nao trate `README.md` ou `docs/` como verdade quando divergirem dele.
- Toda tarefa relevante deve ter spec em `ai/specs/`, baseada em `ai/SPEC_TEMPLATE.md`, antes da implementacao.
- Nao altere escopo silenciosamente. Registre hipoteses, decisoes, pendencias e desvios na spec.
- Preserve a arquitetura NestJS modular, os contratos multi-tenant e o fluxo assincrono de e-mail.
- Atualize documentacao quando mudar modulo, entidade, endpoint, regra de negocio, worker, fila, integracao ou contrato.
- Execute as validacoes reais descritas em `ai/VALIDATION.md`; nao invente comandos.
- Ao concluir, crie `EXIT.md` na pasta da spec com mudancas, validacoes, riscos e estado de commit/push/PR.
- Nunca reverta alteracoes preexistentes do usuario. Nao inclua segredos, `.env`, credenciais SMTP ou API keys reais.

