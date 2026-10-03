# educare-front

Front-end em TanStack Start (React 19, Vite 8). Veja o README.md para a stack e os scripts.

## Regras

- O gerenciador de pacotes é o **npm** (não pnpm/yarn). Adicione componentes do shadcn com `npx shadcn@latest add <nome>`.
- Importe arquivos de `src/` com o alias `#/`. Não existe alias `@/`.
- Para juntar classes, use `import { cn } from "cn"` (o pacote `cn` do shadcn). Não existe `lib/utils`.
- Nunca edite `src/routeTree.gen.ts`: ele é gerado a partir de `src/routes/`.
- Variáveis de ambiente novas vão em `src/env.ts` (validadas com Zod) e no `.env.example`. As que vão para o navegador precisam do prefixo `VITE_`. Leia sempre pelo `env` de `#/env`, não por `import.meta.env`.
- O estilo do código é garantido pelo Biome (tabs, aspas duplas). Não formate à mão.
- Novas funcionalidades seguem o fluxo do OpenSpec em `openspec/` (veja `.claude/skills/openspec-*`).

## Antes de terminar uma mudança

```bash
npm run check -- --write
npm run typecheck
npm test
```
