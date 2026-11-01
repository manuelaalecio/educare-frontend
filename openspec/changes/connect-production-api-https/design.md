# Design

## Context

Veja `proposal.md` (Why) para a motivação. O estado atual do código:

- `src/env.ts` valida `EDUCARE_API_URL` com Zod. Em produção, recusa a URL que não começa com `https://` e lança `Variáveis de ambiente inválidas: EDUCARE_API_URL: deve usar https em produção`. O `src/env.test.ts` cobre o caso, mas só confere que a mensagem cita `EDUCARE_API_URL`, não o texto "deve usar https em produção" que o CA06 da tarefa pede.
- `src/integrations/educare-api/client.ts` usa o `fetch` global do Node (undici), sem agente próprio, sem CA extra e sem desligar a verificação de certificado. Uma falha de TLS chega como `TypeError: fetch failed`, com o código do OpenSSL em `cause`. O log registra só `error.name`, e `performLogin` converte a falha em `unavailable`, com a mensagem "Não foi possível falar com o servidor. Tente de novo em instantes.". Nenhum teste cobre explicitamente o caso de TLS.
- Na Vercel, as variáveis sem `VITE_` são lidas em tempo de execução (`process.env`), mas uma variável alterada só vale para deploys novos. Os previews também rodam com `NODE_ENV=production`.
- Ainda não há ambiente de homologação: os previews usam a mesma API de produção (já documentado no `README.md`).

## Goals / Non-Goals

**Goals:**
- Pôr o front de produção para falar com `https://136-248-80-75.sslip.io` sem mudar o código de produção.
- Deixar a regra "só https e só com certificado válido" coberta por testes, para que uma mudança futura não a afrouxe sem que ninguém perceba.
- Ter um roteiro manual, com ordem e conferências, para o passo na Vercel e o teste de ponta a ponta.

**Non-Goals:**
- Automatizar a configuração da Vercel (por script ou CI).
- Teste automatizado de ponta a ponta contra a API real.

## Decisions

**D1 — Nenhuma mudança em `src/env.ts` nem no cliente; só nos testes.**
A validação e o cliente já fazem o que a spec pede. A change só reforça os testes: o de `env.ts` passa a conferir a mensagem "deve usar https em produção" e a URL real `https://136-248-80-75.sslip.io`, e o cliente e o login ganham um caso de falha de TLS.
*Descartado:* recusar na inicialização um `NODE_TLS_REJECT_UNAUTHORIZED=0` (que desliga a verificação de certificado no Node inteiro). A proteção seria útil, mas é código novo, fora do que a tarefa pede ("não há mudança de código"). Fica como regra no README ("nunca configure") e pode virar uma change própria.

**D2 — A verificação de certificado fica a cargo do padrão do Node, sem CA nem pinning próprios.**
O certificado da Let's Encrypt é confiável no Node da Vercel sem configuração. Não confiar em nada além do repositório de CAs padrão garante que o certificado de staging e o TRAEFIK DEFAULT CERT sejam recusados.
*Descartado:* fixar o certificado ou a chave pública (pinning). O cert-manager troca o certificado a cada renovação (~60 dias), e o pinning derrubaria o front a cada troca. *Descartado também:* acrescentar a CA de staging para testar antes. Isso abriria uma brecha justamente onde a spec pede rigor.

**D3 — A mesma `EDUCARE_API_URL` em Production e Preview.**
A tarefa fala só de Production. Mas os previews também rodam com `NODE_ENV=production`: sem uma URL `https` eles nem sobem, e não há outra API para eles. O README já manda configurar os dois ambientes. O ambiente Development da Vercel não é usado (o desenvolvimento local lê o `.env`).
*Descartado:* só Production. Os previews quebrariam na inicialização e deixariam de servir para revisar PRs.

**D4 — O passo na Vercel só depois do certificado de produção.**
Antes de mexer na Vercel, conferir por fora, sem `-k`: `curl -sS https://136-248-80-75.sslip.io/actuator/health` deve responder 200, e `openssl s_client -connect 136-248-80-75.sslip.io:443 -servername 136-248-80-75.sslip.io </dev/null | openssl x509 -noout -issuer -dates` deve mostrar `O=Let's Encrypt` sem "(STAGING)" nem "TRAEFIK" (o intermediário muda com o tempo; em 1/11/2026 era `CN=YR1`, por isso a conferência não depende do nome dele). Com o certificado de staging, o front recusaria a conexão (spec "Certificado TLS da API verificado"), e o teste de ponta a ponta falharia por um motivo já esperado.
*Descartado:* configurar a variável logo e esperar o certificado ficar pronto. Nesse meio-tempo, o login de produção mostraria "Não foi possível falar com o servidor" sem que desse para saber se o problema era o certificado ou o front.

**D5 — A configuração e o redeploy são feitos pela Manuela, ou com a confirmação explícita dela.**
É uma ação externa, num ambiente que fala com a API de produção. Pode ser feita pelo painel da Vercel (Settings › Environment Variables) ou com `vercel env add EDUCARE_API_URL production` / `preview`, seguida de um redeploy do último deploy de produção (sem cache de build não é preciso: a variável é de runtime). O valor não é segredo, mas não vai para o repositório além do README, que já documenta a URL.

**D6 — Teste de ponta a ponta só com usuário fictício.**
Login em `https://educare-frontend-ruby.vercel.app` com um usuário fictício criado no backend (RN01: nada de dados reais de crianças antes do backup do Postgres). Conferir nos logs da Vercel a linha `[educare-api] POST /api/v1/auth/login 200 …ms` e a ausência de `fetch failed`, e nos logs da API a chamada vinda do servidor da Vercel. Em seguida, navegar para uma página que chame a API (por exemplo, Configurações › Turmas, com um `COORDENADOR`) para ver uma chamada autenticada além do login.

**D7 — README: a seção "Vercel" ganha a URL real e o roteiro curto.**
A seção passa a dizer o valor (`https://136-248-80-75.sslip.io`), a conferência do D4, que mudar a variável exige redeploy, que um erro de certificado aparece como "Não foi possível falar com o servidor" com `fetch failed (TypeError)` no log, que nunca se deve desligar a verificação de TLS e que, até o backup do Postgres, produção e previews só recebem dados fictícios.

## Testes

- **Unitário (Vitest, ambiente node):**
  - `src/env.test.ts`: produção com `http://136.248.80.75` falha com mensagem que contém "EDUCARE_API_URL" e "deve usar https em produção"; produção com `https://136-248-80-75.sslip.io` inicia (D1).
  - `src/integrations/educare-api/client.test.ts`: o `fetch` rejeita com `TypeError('fetch failed')` e `cause` com código `DEPTH_ZERO_SELF_SIGNED_CERT`; o log registra `falhou (TypeError)` e não contém o email, a senha, o token nem o texto do `cause` (D1, D2).
  - `src/integrations/educare-api/auth.test.ts`: `performLogin` com o mesmo erro de TLS devolve `unavailable` com `messages.unavailable` e não grava cookie (D1).
- **Testing Library:** nada novo. A tela de login já mostra a mensagem de `unavailable` (coberto em `src/components/auth/login-form.test.tsx` e em `src/routes/-login.test.tsx`), e a falha de TLS chega a ela como `unavailable`.
- **Manual:**
  - Local, com certificado ruim: `EDUCARE_API_URL=https://self-signed.badssl.com npm run dev`, login com dados fictícios. Esperado: "Não foi possível falar com o servidor. Tente de novo em instantes." e, no terminal, `[educare-api] POST /api/v1/auth/login falhou (TypeError)`. O handshake falha antes de qualquer dado HTTP ser enviado.
  - Produção: as conferências do D4, a configuração do D3/D5 e o roteiro do D6.

## Risks / Trade-offs

- [O sslip.io não tem SLA e pode sair do ar] → O login mostra "Não foi possível falar com o servidor", sem vazar detalhes. Aceitável enquanto só há dados fictícios. O domínio próprio fica para uma tarefa futura, e aí basta trocar a variável e fazer o redeploy.
- [O IP 136.248.80.75 muda se a VM for recriada] → O host do sslip.io muda junto. O README avisa que a `EDUCARE_API_URL` precisa acompanhar o host do Ingress.
- [Variável digitada errado na Vercel (por exemplo, sem `https://`)] → O servidor não sobe e todas as páginas dão erro. Conferir nos logs da função a mensagem "Variáveis de ambiente inválidas: EDUCARE_API_URL: …" logo depois do redeploy, e corrigir.
- [Previews falam com a API de produção] → Já documentado. A regra de dados fictícios (RN01) reduz o dano até existir homologação.
- [Alguém "resolve" um erro de TLS com `NODE_TLS_REJECT_UNAUTHORIZED=0`] → Proibido no README (D7). A proteção em código fica para depois (D1).

## Migration Plan

1. Testes e README (podem ir para a `dev` antes da infra ficar pronta).
2. Esperar as subtarefas de back-end e conferir o certificado de produção (D4).
3. Configurar `EDUCARE_API_URL` em Production e Preview (D3, D5) e fazer o redeploy.
4. Teste de ponta a ponta (D6).

**Rollback:** do lado do front, não há estado anterior funcional para onde voltar. Sem HTTPS na API, o front de produção não sobe por regra. Se o certificado falhar depois do passo 3, o backend segue o próprio rollback (volta a só HTTP), e o front fica mostrando "Não foi possível falar com o servidor" até o HTTPS voltar. Não se troca a variável para `http://`.
