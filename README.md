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

O app roda em http://localhost:3000.

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

## Convenções

- Imports a partir de `src/` usam o alias `#/` (ex.: `import { Button } from "#/components/ui/button"`).
- Componentes do shadcn são adicionados com `npx shadcn@latest add <componente>`.
- `src/routeTree.gen.ts` é gerado automaticamente: não edite à mão.
- Variáveis de ambiente novas precisam ser declaradas em `src/env.ts` e no `.env.example`. As que vão para o navegador precisam começar com `VITE_`.
