# Teste local do código novo (antes do deploy)

- **Quando:** 2026-11-04, cerca de 00:48–00:52 UTC.
- **Como:** o build de produção do commit `8b29e26` rodando na máquina de desenvolvimento (`node .output/server/index.mjs`, porta 3002), ligado à API de produção, com a mesma carga da linha de base (3 turmas, 200 crianças, 4 usuários). Foi usado o mesmo `roteiro.mjs`, só com outro endereço. As chamadas ao Spring foram contadas no log do servidor local.
- **Limite:** os tempos não se comparam com a linha de base, porque o servidor rodou fora da Vercel. Comparam-se as quantidades.

| Passo | Antes (produção) | Depois (local) |
| --- | --- | --- |
| **10 F5 em Usuários**, chamadas ao Spring | 20 | **11**: 10 `/auth/me` + 1 `/users`, quando os 30 s venceram; as outras 9 vieram do cache |
| 10 F5, chamadas do navegador ao BFF | 10 | **0**: a lista já vem no HTML, sem skeleton |
| Início → Configurações (Usuários) | 1 | **0** |
| Renomear turma | `PUT` + turmas | `PUT` + turmas, sem usuários |
| Nome duplicado (`409`) | — | só o `POST`, nenhuma nova busca |
| Roteiro inteiro, chamadas ao Spring | 35 | **24**, com 10 respostas do cache do BFF |

## Outros cenários

- "Atualizado agora" e "Atualizar" aparecem nas duas abas, e o clique faz uma chamada do navegador ao BFF. **Dentro dos 30 s, ela é respondida pelo cache do BFF** (`cache classrooms hit` / `cache users hit`). Isso ficou registrado como dívida técnica no design.md (Risks / Trade-offs).
- Conferência visual de Usuários e Turmas em 1440 px e 390 px, nos modos claro e escuro: sem problemas de layout nem de contraste.
- Não testados aqui: o logout com outra pessoa entrando no mesmo navegador e a gravação vinda de outra sessão (CA04 e CA06). Ficam para depois do deploy (tarefa 5.1).
