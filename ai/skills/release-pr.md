# Playbook: release e Pull Request

1. Leia a spec e o `EXIT.md`; confirme que o escopo entregue corresponde ao planejado.
2. Revise `git status` e `git diff`; exclua segredos, artefatos e mudancas alheias.
3. Execute ou confirme as validacoes obrigatorias. Registre falhas e checks nao executados.
4. Atualize documentacao e `EXIT.md` antes do commit.
5. Crie commit no formato Conventional Commits observado no repositorio.
6. Faça push da branch quando autenticacao e permissao permitirem.
7. Abra PR em portugues brasileiro com contexto, mudancas, contratos, validacoes, riscos, pendencias e caminho da spec.
8. Confirme URL e estado do PR no `EXIT.md`.
9. Se commit, push ou PR falharem, registre comando/etapa e motivo exato; nao esconda o bloqueio.

Nao faça merge ou release destrutivo sem pedido explicito.
