# Regras de documentacao

## Quando atualizar

Atualize documentacao na mesma tarefa sempre que mudar:

- modulo NestJS, responsabilidade ou dependencia entre modulos;
- entidade/model Prisma, enum, relacao, seed ou estrategia de migracao;
- endpoint, header, DTO, status HTTP, resposta, autenticacao ou erro;
- regra de negocio, especialmente multi-tenancy e lifecycle de `EmailJob`;
- worker, fila, payload, retry/backoff ou transicao de status;
- integracao Neon/PostgreSQL, SQS, Lambda, SES, SMTP/Nodemailer ou novo provider;
- variavel de ambiente, comando de operacao ou comando de validacao;
- contrato publico TypeScript ou comportamento relevante para consumidores.

## Onde documentar

- Contexto e baseline: `ai/PROJECT_CONTEXT.md`.
- Estrutura e fluxos atuais: `ai/ARCHITECTURE.md`.
- Convencoes de implementacao: `ai/TECHNICAL_WORKSTYLE.md`.
- Comandos e baseline de checks: `ai/VALIDATION.md`.
- Processo Git/PR: `ai/GIT_AND_PR_WORKFLOW.md`.
- Decisao e escopo da tarefa: spec ativa em `ai/specs/`.
- Resultado executado: `EXIT.md` da spec.
- Setup/uso humano do projeto: `README.md` e `.env.example`, quando afetados.
- Specs historicas em `docs/`: atualize somente se a tarefa explicitamente mantiver esse contrato; nao replique divergencias sem explicar.

## Documentacao no codigo

- Funcoes/metodos publicos novos ou alterados devem ter JSDoc.
- Regras de negocio complexas devem documentar invariantes, efeitos colaterais e estados.
- Integracoes externas devem documentar configuracao esperada, falhas relevantes, retry/idempotencia e tratamento de dados sensiveis.
- Comentarios devem explicar o porquê, nao narrar linha por linha.

## Qualidade e veracidade

- Descreva comportamento observado, nao intencao presumida.
- Diferencie claramente estado atual, decisao da spec, hipotese e roadmap.
- Nao declare TypeORM, provider, endpoint, migracao ou comando como existente sem evidencia no repositorio.
- Inclua exemplos sem segredos. Use placeholders para API keys, SMTP e URLs sensiveis.
- Mantenha linguagem em portugues brasileiro para documentos do fluxo de agentes e Pull Requests.
