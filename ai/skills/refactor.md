# Playbook: refactor

1. Defina na spec qual complexidade sera reduzida e quais comportamentos devem permanecer identicos.
2. Registre contratos protegidos: HTTP, Prisma, SQS/payload, status de job, provider, Lambda e logs.
3. Estabeleca baseline de testes/validacao antes de editar.
4. Refatore em passos pequenos e evite misturar feature ou bugfix nao necessario.
5. Preserve fronteiras dos modulos NestJS e injecao de dependencia.
6. Nao altere schema, contratos publicos ou comportamento externo silenciosamente.
7. Atualize testes para provar equivalencia e documentacao caso a arquitetura interna relevante mude.
8. Execute todas as validacoes aplicaveis e compare com o baseline.
9. Registre equivalencia, desvios e riscos no `EXIT.md`.
10. Siga o fluxo de commit/push/PR.
