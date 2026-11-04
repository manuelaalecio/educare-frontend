# Linha de base: requisições antes do `optimize-query-cache`

- **Quando:** 2026-11-04, 00:36:02–00:36:53 UTC (21:36 em Brasília).
- **Onde:** produção (`https://educare-frontend-ruby.vercel.app`), com o código anterior a esta change. O commit `8b29e26` ainda não foi publicado.
- **Carga:** 3 turmas (Jardim I com 66 crianças, Maternal A com 67, Maternal B com 67), 200 crianças fictícias e 4 usuários. Tudo foi cadastrado em 2026-11-04 pelas server functions da própria aplicação. As crianças têm só os campos obrigatórios: sem CPF, RG nem dados de saúde.
- **Como:** `roteiro.mjs`, nesta pasta, no ego lite, com a sessão do Administrador (`COORDENADOR`). O navegador mede as chamadas `/_serverFn/…` (navegador → BFF), e os Runtime Logs da Vercel (linhas `[educare-api]`) mostram as chamadas ao Spring, inclusive as do SSR. Os dados brutos estão em `linha-de-base.json` e `linha-de-base-vercel.json`. A primeira medição, feita com o banco vazio, fica em `sem-dados/`.

## Por passo

| Passo | Navegador → BFF | Spring |
| --- | --- | --- |
| Carga completa de Usuários | 1 | `auth/me` (SSR) + `users` |
| Usuários → Turmas | 1 | `classrooms` |
| Turmas → Início | 0 | |
| Início → Configurações (Usuários) | **1**, usuários sem `staleTime` | `users` |
| Usuários → Turmas (de novo) | 0, turmas guardadas por 5 min | |
| Renomear turma | 2 | `PUT classrooms/{id}` + `classrooms` |
| Desfazer o nome | 2 | `PUT classrooms/{id}` + `classrooms` |
| Turmas → Crianças | **2, a mesma lista duas vezes** | `children` ×2 |
| Crianças → detalhes | 2 | `children/{id}` + `children/{id}/classrooms` |
| Detalhes → voltar à lista | 0 | |
| Crianças → página 2 | 1 | `children` |
| Crianças → Início → Crianças (< 1 min) | 0 | |
| **10 F5 em Usuários** | **10**, uma por F5 | **20**: 10 `auth/me` (SSR) + 10 `users` |

O roteiro inteiro fez **35 chamadas ao Spring**: 33 leituras e 2 gravações.

## Por rota no Spring (Runtime Logs da Vercel)

| Rota | Origem | Chamadas | Mediana | p95 | Máx. |
| --- | --- | --- | --- | --- | --- |
| `GET /api/v1/auth/me` | SSR | 12 | 120 ms | 359 ms | 359 ms |
| `GET /api/v1/users` | BFF | 13 | 123 ms | 360 ms | 360 ms |
| `GET /api/v1/classrooms` | BFF | 3 | 122 ms | 128 ms | 128 ms |
| `GET /api/v1/children` | BFF | 3 | 132 ms | 132 ms | 132 ms |
| `GET /api/v1/children/{id}` | BFF | 1 | 121 ms | | |
| `GET /api/v1/children/{id}/classrooms` | BFF | 1 | 357 ms | | |
| `PUT /api/v1/classrooms/{id}` | BFF | 2 | 129 ms | 363 ms | 363 ms |

## 10 F5 em Usuários

- **20 chamadas ao Spring** (21:36:31.9–21:36:52.4): em cada F5, o SSR chama `/auth/me` e, cerca de 380 ms depois, o navegador busca `/users` pela server function.
- O documento carregou em 334–393 ms (mediana 347 ms). Depois disso, a lista ainda esperou a chamada do navegador, de 271–313 ms (mediana 280 ms), com o skeleton na tela.

## Observações

- **Turmas → Crianças busca a lista duas vezes** (21:36:20.11 e 21:36:20.41, com a mesma resposta). A causa provável é o preload por intenção (o clique passa o ponteiro sobre o link), seguido de uma segunda busca na navegação. A medição depois do deploy vai mostrar se isso continua.
- **Cerca de 240 ms a mais na primeira chamada depois de uma pausa** (`auth/me` 359 ms, `users` 360 ms, `PUT` 363 ms, `children/{id}/classrooms` 357 ms; as demais ficam em 120–130 ms). Isso puxa os p95 para cima. Parece a abertura de uma conexão TLS nova do BFF até a API. Não faz parte desta change, mas vale olhar o keep-alive.
- O p95 do Actuator (subtarefa [Back]) continua sendo a referência para o tempo do Spring. Os tempos acima incluem a rede entre a Vercel e a VM.

## Meta depois do deploy (spec)

- 10 F5: 10 `/auth/me` e no máximo 1 `/users` no Spring, e **0** chamadas do navegador ao BFF.
- Início → Configurações (Usuários) em menos de 1 min: 0 chamadas.
- Renomear turma: `PUT` + `classrooms`, sem `users`.
- Para comparar, rodar o mesmo `roteiro.mjs` (`ego-browser.exe nodejs < roteiro.mjs`) e coletar os Runtime Logs do período.
