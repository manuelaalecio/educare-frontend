# Design

## Context

- `src/styles.css` (Tailwind v4, `@theme inline`) tem duas camadas: os tokens do shadcn em `oklch` na paleta `zinc` (`:root` e `.dark`) e as variáveis e classes da landing do template (`--sea-ink`, `.island-shell`...), que nada em `src/` usa. O `body` tem gradientes, `::before`/`::after` decorativos e uma regra em `@layer base` que sobrescreve o fundo com `--background`.
- O modo escuro já é por classe: `@custom-variant dark (&:is(.dark *))`, e os componentes do shadcn (`button`, `input`, `select`, `switch`, `textarea`) já usam `dark:`. Falta só pôr a classe `.dark` no `<html>`.
- `__root.tsx` usa `shellComponent` e renderiza `<html lang="en">` com o título "TanStack Start Starter". A fonte vem por `@import` do Google Fonts no topo do CSS (Fraunces + Manrope).
- O projeto é SSR. O servidor não sabe a preferência do sistema do visitante, então o tema certo só pode ser decidido no navegador antes da primeira pintura.

## Goals / Non-Goals

**Goals:**
- Trocar a paleta só pelos tokens, sem editar os componentes do shadcn, para que `npx shadcn add` continue gerando componentes que já saem no tema.
- Tema certo na primeira pintura, sem aviso de hidratação.

**Non-Goals:**
- Um provedor React de tema com contexto. Nada além do botão precisa saber o tema, e a classe no `<html>` basta para o CSS.

## Decisions

### D1. Tokens em hex, escala `sage` no `@theme`
Os valores dos tokens passam de `oklch` para hex, iguais aos da spec e dos modelos aprovados, o que facilita conferir com a tabela. A escala entra no `@theme` (não `inline`) como `--color-sage-50` a `--color-sage-950`, gerando as classes `bg-sage-*`, `text-sage-*` e `border-sage-*`. Os tokens semânticos apontam para ela (`var(--color-sage-100)`...). As cores `emerald` e `red` entram como hex literal, com o nome do tom num comentário: no Tailwind v4 elas estão em `oklch`, e os valores não batem com os da spec (o `emerald-700` do v4 dá cerca de `#007a55`, não `#047857`). Só os tokens de gráfico, que a spec não fixa em hex, usam as cores do Tailwind (`var(--color-teal-600)`...):

| Token | Claro | Escuro |
|---|---|---|
| `--background` | sage-100 | sage-950 |
| `--foreground` | sage-900 | sage-50 |
| `--card`, `--popover` | branco | sage-900 |
| `--primary` / `--primary-foreground` | emerald-700 / branco | emerald-500 / emerald-950 |
| `--secondary`, `--muted`, `--accent` | sage-50 | sage-800 |
| `--secondary-foreground`, `--accent-foreground` | sage-900 | sage-50 |
| `--muted-foreground` | sage-500 | sage-400 |
| `--border` | sage-200 | sage-800 |
| `--input` | sage-300 | sage-700 |
| `--ring` | emerald-600 | emerald-400 |
| `--destructive` | red-600 | red-400 |

`--sidebar-*` repete os equivalentes acima (`--sidebar-primary` = `--primary` etc.). `--chart-1` a `--chart-5` ficam emerald-600, teal-600, amber-500, sky-600 e sage-500 no claro, e os tons 400 no escuro. O `sage-500` é `#5f7268`, e não o `#66796f` dos modelos: este dá só 4,2:1 sobre o `sage-100`.

**Alternativa descartada:** usar `stone` ou `zinc` direto. A opção escolhida nos modelos foi a C, e nenhuma escala pronta do Tailwind tem esse cinza esverdeado.

### D2. Preferência no `localStorage` + script inline no `<head>`
- Chave `educare-tema`, com valor `"claro"` ou `"escuro"`. Sem chave, vale `prefers-color-scheme`.
- Um script inline pequeno no `<head>` do `__root.tsx` lê a chave, resolve o tema e aplica `classList.toggle("dark", ...)` e `style.colorScheme` no `<html>`. Ele roda antes da primeira pintura, inclusive na página vinda do SSR. Fica dentro de `try/catch`: com o armazenamento bloqueado, vale o sistema. O React 19 move o `<link>` do CSS e o `<title>` para o começo do `<head>`, então o script acaba depois do CSS. Isso não muda nada: ele continua no `<head>`, antes do `<body>`, e roda antes da primeira pintura.
- `<html lang="pt-BR" suppressHydrationWarning>`: a classe aplicada pelo script difere do HTML do servidor, e esse atributo existe exatamente para isso (só afeta os atributos do próprio `<html>`).
- O texto do script é gerado a partir de uma função exportada de `src/components/theme/theme-script.ts` (chave, valores e lógica num lugar só), testável no jsdom.

**Alternativas:**
- Cookie lido no SSR: resolve a escolha manual, mas não o "seguir o sistema" na primeira visita, que precisaria do header `Sec-CH-Prefers-Color-Scheme` (só no Chromium) ou de um script do mesmo jeito.
- Biblioteca (`next-themes` e similares): é feita para o Next, e o que ela resolve aqui cabe em ~20 linhas.

### D3. Botão de tema
`src/components/theme/theme-toggle.tsx`: um `Button` `variant="ghost"` `size="icon"` com `Sun`/`Moon` do `lucide-react` e `aria-label` "Usar tema escuro" ou "Usar tema claro". No clique, inverte o tema atual (lido da classe do `<html>`), aplica a classe, grava a chave (em `try/catch`) e atualiza o estado. Um `useEffect` assina `matchMedia("(prefers-color-scheme: dark)")` e acompanha a mudança do sistema enquanto não há chave salva.

O primeiro render no servidor não sabe o tema. Para não haver aviso de hidratação, o ícone e o `aria-label` só são definidos depois de montar (o estado começa `undefined` e o botão renderiza sem ícone até o `useEffect`). É um botão pequeno, então essa troca não aparece.

Enquanto não há cabeçalho, o botão fica fixo no canto superior direito (`fixed top-4 right-4`), renderizado pelo `RootDocument`. A `add-backend-integration` o move para o cabeçalho.

### D4. Fonte e CSS base
- O `@import` do Google Fonts passa a carregar só a Manrope (400 a 800). `--font-sans` continua Manrope.
- O `body` fica `bg-background text-foreground font-sans antialiased`, num único `@layer base`, sem gradientes nem pseudo-elementos.
- Saem as variáveis da landing e as classes `.island-shell`, `.island-kicker`, `.feature-card`, `.nav-link`, `.page-wrap`, `.display-title`, `.rise-in`, `.site-footer` e as regras de `a`, `code` e `.prose pre` do template. O plugin `@tailwindcss/typography` continua: não custa nada sem uso e pode servir para textos longos depois.

### D5. Testes
- Unitário: as funções de `theme-script.ts` (`resolveTheme(stored, systemDark)` e a aplicação no elemento), cobrindo preferência salva, ausente, valor inválido e armazenamento que lança erro.
- Unitário: contraste. Uma função `contrastRatio(hex, hex)` (fórmula da WCAG 2.x) num arquivo de teste, verificando os pares da spec "Contraste mínimo". Os valores ficam num `src/components/theme/palette.ts`, que o teste lê. Isso garante que um ajuste futuro na paleta que quebre o contraste falhe o `npm test`. O `styles.css` não é lido pelo teste, então a tarefa de verificação compara os dois.
- Testing Library: `ThemeToggle` alternando a classe, o nome acessível e a chave salva, e seguindo um `matchMedia` simulado.
- Manual: recarregar no modo escuro com a limitação de CPU do DevTools e conferir que não há quadro claro; console sem avisos de hidratação.

## Risks / Trade-offs

- [Script inline e uma futura Content-Security-Policy] → hoje não há CSP. Quando houver, o script precisa de nonce ou hash; fica anotado no comentário do `__root.tsx`.
- [Hex no lugar de `oklch`] → perde a interpolação perceptual nos `/opacidade` (`ring/50`), uma diferença imperceptível nessas cores.
- [Paleta duplicada em `palette.ts` e no `styles.css`] → a tarefa de verificação confere os dois. Gerar o CSS a partir do TS seria mais robusto, mas complica o build sem ganho agora.
- [`suppressHydrationWarning` esconde avisos reais nos atributos do `<html>`] → só vale para o próprio elemento, não para os filhos.

## Migration Plan

Sem migração de dados. Rollback: reverter o commit.
