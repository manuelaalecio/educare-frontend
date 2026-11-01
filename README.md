# educare-front

Front-end do Educare, feito com [TanStack Start](https://tanstack.com/start) (React 19 + Vite).

## Stack

- **Rotas:** TanStack Router (rotas por arquivo em `src/routes/`)
- **Dados:** TanStack Query, TanStack Form, TanStack Table
- **UI:** Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com/) (`src/components/ui/`)
- **Variáveis de ambiente:** validadas com `@t3-oss/env-core` + Zod em `src/env.ts`
- **Lint e formatação:** Biome
- **Testes:** Vitest + Testing Library
- **Deploy:** Vercel

## Começando

```bash
npm install
cp .env.example .env
npm run dev
```

O app roda em http://localhost:3000. Para entrar no sistema, a API precisa estar no ar (veja abaixo).

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento na porta 3000 |
| `npm run build` | Build de produção |
| `npm run preview` | Serve o build localmente |
| `npm test` | Roda os testes uma vez |
| `npm run test:watch` | Roda os testes em modo watch |
| `npm run typecheck` | Checa os tipos com o TypeScript |
| `npm run check` | Lint + formatação com o Biome (`-- --write` para corrigir) |
| `npm run generate-routes` | Gera o `src/routeTree.gen.ts` manualmente |
| `npm run api:generate` | Gera os tipos da API em `src/integrations/educare-api/schema.gen.ts` |

## Convenções

- Imports a partir de `src/` usam o alias `#/` (ex.: `import { Button } from '#/components/ui/button'`).
- Componentes do shadcn são adicionados com `npx shadcn@latest add <componente>`. O shadcn gera `import * as React`: troque por imports nomeados.
- Estilo pelo Biome: aspas simples (inclusive no JSX), sem ponto e vírgula quando não é necessário, e imports nomeados do React (`import { useState } from 'react'`), sem `import * as React`.
- `src/routeTree.gen.ts` é gerado automaticamente: não edite à mão.
- Variáveis de ambiente novas precisam ser declaradas em `src/env.ts` e no `.env.example`. As que vão para o navegador precisam começar com `VITE_`.

## Integração com a API

O front fala com a API do Educare ([`educare-backend`](https://github.com/manuelaalecio/educare-backend)) como um BFF: **o navegador nunca chama a API**. As chamadas saem de server functions do TanStack Start, no servidor do front, e o token da sessão fica no cookie `educare_session`, com `HttpOnly`, que o JavaScript do navegador não lê. O código fica em `src/integrations/educare-api/`:

- `client.ts`: cliente tipado (`openapi-fetch`) com o `Authorization: Bearer`, tempo limite de 10 s e log sem corpo nem headers. Só pode ser importado no servidor.
- `errors.ts` e `messages.ts`: conversão das respostas de erro (`ProblemDetail`) em `ApiError` e as mensagens fixas da interface.
- `functions.ts`: as server functions (`login`, `logout`, `getCurrentUser`, `changeOwnPassword`). A lógica fica em `auth.ts`, testável sem o runtime do Start.
- `middleware.ts`: o middleware `authenticated` das server functions que exigem sessão. Num `401` da API, ele apaga o cookie e manda para `/login`.

### `EDUCARE_API_URL`

URL da API, lida só no servidor. Em desenvolvimento, `http://localhost:8080` (o valor do `.env.example`). Em produção, precisa ser `https://`: o servidor não sobe com `http`, com a variável vazia ou sem ela.

### Tipos da API

Os tipos de `schema.gen.ts` são gerados do contrato OpenAPI do backend e ficam commitados, então o build não depende da rede. Regere os tipos a cada mudança no contrato do backend:

```bash
npm run api:generate                                                 # baixa da main do educare-backend
API_CONTRACT=../educare-backend/openapi/educare-api.json npm run api:generate  # usa uma cópia local
```

Se um campo usado pelo front sumir do contrato, o `npm run typecheck` acusa.

### Rodando com o backend local

1. No `educare-backend`, suba a API com `./gradlew bootRun`. Ela fica em `http://localhost:8080`.
2. Aqui, `cp .env.example .env` (se ainda não tiver feito) e `npm run dev`.
3. Entre com `admin@educare.org`. A senha é `educare123` quando o `bootRun` roda sem `EDUCARE_ADMIN_PASSWORD`. Com o banco criado pelo `docker compose`, a senha é a que estava no `.env` do backend quando o banco foi criado.

### Vercel

Configure `EDUCARE_API_URL=https://136-248-80-75.sslip.io` nos ambientes Production e Preview. Os previews também rodam com `NODE_ENV=production`, então também não sobem sem `https`. A API roda no k3s da Oracle, com certificado da Let's Encrypt emitido e renovado pelo cert-manager (veja o README do `educare-backend`). Se o IP da VM mudar, o host do Ingress muda, e a variável precisa acompanhar.

Antes de trocar a variável, confira por fora que a API responde com o certificado de produção:

```bash
curl -sS https://136-248-80-75.sslip.io/actuator/health   # sem -k: tem que dar 200
openssl s_client -connect 136-248-80-75.sslip.io:443 -servername 136-248-80-75.sslip.io </dev/null 2>/dev/null \
  | openssl x509 -noout -issuer -dates                      # O=Let's Encrypt, sem "(STAGING)" nem "TRAEFIK"
```

Uma variável alterada só vale para deploys novos: depois de mudar, faça o redeploy.

O servidor do front verifica o certificado da API. Um certificado inválido (autoassinado, de staging, vencido ou de outro host) aparece na tela como "Não foi possível falar com o servidor. Tente de novo em instantes.", e no log da função como `[educare-api] POST /api/v1/auth/login falhou (TypeError)`. **Nunca** configure `NODE_TLS_REJECT_UNAUTHORIZED=0` nem outra forma de desligar essa verificação: corrija o certificado na API.

**Cuidado com os previews:** não há ambiente de homologação, então os previews usam a mesma `EDUCARE_API_URL` e falam com a API de produção. Teste neles como se fosse produção. Até existir o backup automático do Postgres, produção e previews só recebem dados fictícios, nunca dados reais de crianças.

### Rotas protegidas

Toda página sob `src/routes/_authenticated/` exige sessão. Sem sessão, o usuário vai para `/login?redirect=<página>`, já na renderização no servidor. Uma rota criada fora dessa pasta é pública.

Essas páginas ganham a barra lateral e o cabeçalho (com o título da página, o botão de tema e o menu do usuário) do layout em `src/routes/_authenticated.tsx`. A página só precisa do próprio `<main>`. Para pôr uma página nova na barra lateral, acrescente um item em `src/components/layout/nav-items.ts`: o título dele também vira o título do cabeçalho, e `roles` limita quem vê o item. O estado recolhido da barra fica no cookie `sidebar_state`, lido no servidor.
