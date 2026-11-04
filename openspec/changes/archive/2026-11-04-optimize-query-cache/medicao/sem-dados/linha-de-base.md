# Linha de base: requisições antes do `optimize-query-cache`

- **Quando:** 2026-11-04, 00:21:15–00:21:49 UTC
- **Onde:** produção (`https://educare-frontend-ruby.vercel.app`), com o código anterior a esta change. O commit `8b29e26` ainda não foi publicado.
- **Quem:** Administrador (`COORDENADOR`), no ego lite.
- **Como:** `roteiro.mjs`, nesta pasta, lê as entradas `performance` do navegador. Cada `/_serverFn/…` é uma chamada do navegador ao BFF. As chamadas ao Spring (inclusive as do SSR) saem dos Runtime Logs da Vercel, nas linhas `[educare-api]`. Os dados brutos estão em `linha-de-base.json` (navegador) e `linha-de-base-vercel.json` (logs, 21:21:14–21:21:49 no horário de Brasília).
- **Dados em produção:** 0 turmas e 0 crianças, então o roteiro não renomeia turma nem abre detalhes de criança.

Os ids das server functions são hashes. Pelo contexto de cada passo: `b48994e4` = `getUsers`, `bcf262bb` = `getClassrooms`, `87b5eddd` = `getChildren`.

| Passo | Chamadas do navegador ao BFF | Tempo |
| --- | --- | --- |
| Carga completa de Usuários | 1 (`getUsers`) | 283 ms (documento: 594 ms) |
| Usuários → Turmas | 1 (`getClassrooms`) | 279 ms |
| Turmas → Início | 0 | |
| Início → Configurações (Usuários) | **1 (`getUsers`)**, sem `staleTime` | 299 ms |
| Usuários → Turmas (de novo) | 0, turmas já guardadas por 5 min | |
| Turmas → Crianças | 1 (`getChildren`) | 279 ms |
| Crianças → Início → Crianças (< 1 min) | 0 | |
| **10 F5 em Usuários** | **10 (`getUsers`, uma por F5)** | 271–296 ms (mediana 280 ms) |

## Chamadas ao Spring (Runtime Logs da Vercel)

O roteiro inteiro gerou **27 chamadas ao Spring**.

| Rota | Origem | Chamadas | Mediana | p95 | Máx. |
| --- | --- | --- | --- | --- | --- |
| `GET /api/v1/auth/me` | SSR | 12 | 122 ms | 355 ms | 355 ms |
| `GET /api/v1/users` | navegador → BFF | 13 | 123 ms | 125 ms | 125 ms |
| `GET /api/v1/classrooms` | navegador → BFF | 1 | 121 ms | 121 ms | 121 ms |
| `GET /api/v1/children` | navegador → BFF | 1 | 123 ms | 123 ms | 123 ms |

O p95 de `/auth/me` vem da primeira chamada do roteiro (355 ms). As seguintes ficaram em 120–123 ms. Com amostras tão pequenas, o p95 por rota do Actuator (subtarefa [Back]) é a referência mais confiável.

## 10 F5 em Usuários

- **20 chamadas ao Spring** (21:21:28–21:21:49): 10 `GET /api/v1/auth/me`, feitas pelo SSR de `/configuracoes/usuarios`, e 10 `GET /api/v1/users`, feitas pela server function do navegador cerca de 400 ms depois de cada uma. A tarefa estimava cerca de 20; o número está confirmado.
- O par que aparece às 21:21:27 é a carga de `/configuracoes/usuarios` feita antes dos F5, e não entra na conta.
- O documento carregou em 353–369 ms. Depois disso, a lista ainda esperou a chamada do navegador (cerca de 280 ms), com o skeleton na tela.

## Meta depois do deploy (spec)

- 10 F5: 10 `/auth/me` e no máximo 1 `/users` no Spring, e **0** chamadas do navegador ao BFF.
- Início → Configurações (Usuários) em menos de 1 min: 0 chamadas.
- Para comparar, rodar o mesmo `roteiro.mjs` (`ego-browser.exe nodejs < roteiro.mjs`).
