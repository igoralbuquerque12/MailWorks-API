# Playbook: implementacao de feature

1. Leia a spec aprovada e execute o playbook de investigacao quando houver lacunas.
2. Confirme contratos atuais e impacto em tenant, API key, provider, job, fila e integracoes.
3. Implemente em incrementos pequenos, seguindo os modulos NestJS e contratos existentes.
4. Para endpoint novo/alterado, trate DTO, validacao, status HTTP, erros e testes.
5. Para dado novo/alterado, alinhe schema Prisma, queries, seed, geracao do client e migracao prevista na spec.
6. Para processamento assincrono, documente payload, retry, idempotencia e transicoes.
7. Adicione JSDoc a contratos publicos, regras complexas e integracoes externas aplicaveis.
8. Atualize documentacao obrigatoria.
9. Execute a matriz de `ai/VALIDATION.md`, revise o diff e corrija regressoes.
10. Atualize a spec, crie `EXIT.md` e siga o fluxo de commit/push/PR.

Nao transforme envio de e-mail em operacao sincrona nem enfraqueca isolamento por tenant sem decisao explicita na spec.

