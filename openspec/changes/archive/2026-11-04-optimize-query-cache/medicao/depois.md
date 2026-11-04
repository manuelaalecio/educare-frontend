# Depois: o mesmo roteiro com o código novo na Vercel

- **Quando:** 2026-11-04, 23:11:48–23:12:34 UTC (20:11–20:12 em Brasília).
- **Onde:** preview da `dev` na Vercel (`educare-frontend-git-dev-manuelaalecios-projects.vercel.app`), com o código do PR #4, ligado à API de produção. A carga é a mesma da linha de base: 3 turmas, 200 crianças e 4 usuários. O back já tinha o limite de requisições publicado.
- **Como:** o mesmo `roteiro.mjs` da linha de base, só com outro endereço, e os Runtime Logs da Vercel do período. Os dados brutos estão em `depois.json` e `depois-vercel.json`.

## Antes × depois

| Passo | Antes: Spring | Depois: Spring | Antes: navegador → BFF | Depois: navegador → BFF |
| --- | --- | --- | --- | --- |
| Carga completa de Usuários | `auth/me` + `users` | `auth/me` + `users` (SSR) | 1 | **0** |
| Usuários → Turmas | 1 | 1 | 1 | 1 |
| Início → Configurações (Usuários) | 1 | **0** | 1 | **0** |
| Renomear turma (e desfazer) | `PUT` + turmas, 2× | `PUT` + turmas, 2× (sem usuários) | 4 | 4 |
| Turmas → Crianças (página 1 + página 2 antecipada) | 2 | 2 | 2 | 2 |
| Crianças → detalhes | 2 | 2 | 2 | 2 |
| Crianças → página 2 (página 3 antecipada) | 1 | 1 | 1 | 1 |
| **10 F5 em Usuários** | **20** | **11** | **10** | **0** |
| **Roteiro inteiro** | **35** | **24** (+10 respostas do cache do BFF) | 22 | **10** |

Nos 10 F5, o SSR chamou `/auth/me` todas as vezes, como deve ser, e `/users` só uma vez (às 20:12:19.96, quando os 30 s do cache venceram). As outras 9 respostas foram `cache users hit`.

## Tempos

| | Antes | Depois |
| --- | --- | --- |
| F5: documento carregado (mediana) | 347 ms | 511 ms |
| F5: lista na tela | depois do documento, mais uma chamada de ~280 ms com o skeleton | **junto com o documento, sem skeleton** |
| Mediana por rota no Spring | 120–130 ms | 125–175 ms |

- Pela soma, a lista aparecia em cerca de 630 ms (347 + ~280) e agora aparece com o documento, em cerca de 511 ms.
- O documento ficou mais pesado: o HTML traz os dados da lista, e entrou o script do Vercel Analytics (commit `0ca9902`), que conta no `load`. Por isso o `load` subiu.
- A primeira carga do roteiro (1243 ms) e um F5 (879 ms) foram mais lentos: são uma função fria do preview e uma oscilação. Não são o padrão.
- A primeira chamada depois de uma pausa continua levando cerca de 240 ms a mais (`auth/me` 364–367 ms, `users` 380 ms). É a mesma observação da linha de base, sobre o keep-alive entre a Vercel e a API.

## Conclusão

As metas da spec foram atingidas: 10 F5 → 10 `/auth/me` e no máximo 1 `/users`, nenhuma chamada do navegador ao BFF, Início → Usuários sem chamada, e renomear turma sem buscar usuários. No roteiro inteiro, as chamadas ao Spring caíram de 35 para 24 (−31 %), e as do navegador ao BFF, de 22 para 10 (−55 %).
