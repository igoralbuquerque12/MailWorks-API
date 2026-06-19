# Playbook: bugfix

1. Reproduza o bug e registre comando, entrada, comportamento atual e esperado na spec.
2. Determine se e falha preexistente conhecida ou regressao nova.
3. Trace o fluxo afetado ate a causa raiz; nao pare no primeiro sintoma.
4. Crie ou ajuste teste que falhe antes da correcao, quando viavel.
5. Faça a menor correcao coerente com a arquitetura e preserve contratos nao relacionados.
6. Verifique efeitos em status de jobs, retries, dados multi-tenant, cache e erros externos.
7. Atualize documentacao se o comportamento correto ou um contrato mudar.
8. Execute validacoes focadas e depois a matriz obrigatoria aplicavel.
9. Registre causa raiz, correcao, cobertura, riscos e falhas remanescentes no `EXIT.md`.
10. Siga o fluxo de commit/push/PR.

Nao use uma falha conhecida dos testes ou do schema como justificativa para ignorar novas falhas.

