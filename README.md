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

- Imports a partir de `src/` usam o alias `#/` (ex.: `import { Button } from "#/components/ui/button"`).
- Componentes do shadcn são adicionados com `npx shadcn@latest add <componente>`.
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

Configure `EDUCARE_API_URL` com a URL `https://` da API, nos ambientes Production e Preview.

**Cuidado com os previews:** não há ambiente de homologação, então os previews usam a mesma `EDUCARE_API_URL` e falam com a API de produção, com dados reais de crianças. Teste neles como se fosse produção.

### Rotas protegidas

Toda página sob `src/routes/_authenticated/` exige sessão. Sem sessão, o usuário vai para `/login?redirect=<página>`, já na renderização no servidor. Uma rota criada fora dessa pasta é pública.
