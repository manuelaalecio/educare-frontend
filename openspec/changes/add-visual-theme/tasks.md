# Tasks

## 1. Paleta e contraste

- [x] 1.1 Criar `src/components/theme/palette.ts` com a escala `sage` e os pares de texto e fundo da spec (D1, D5), e `palette.test.ts` com `contrastRatio` (WCAG 2.x) verificando que todos os pares de "Contraste mínimo" passam de 4,5:1 nos dois modos, mais um caso de controle (`#059669` sobre branco < 4,5). Verificar com `npm test`
- [x] 1.2 Reescrever `src/styles.css` (D1, D4): só Manrope no `@import`, escala `--color-sage-*` no `@theme`, tokens do `:root` e do `.dark` conforme a tabela da D1, `body` com `bg-background text-foreground font-sans antialiased`, e remoção das variáveis, gradientes, pseudo-elementos e classes do template. Verificar com `grep -nE "sea-ink|lagoon|island-|Fraunces" src/styles.css` sem resultado, que os hex do CSS batem com o `palette.ts`, e com `npm run build` sem erros

## 2. Tema claro e escuro

- [x] 2.1 Criar `src/components/theme/theme-script.ts` (D2) com `THEME_STORAGE_KEY`, `resolveTheme` e o texto do script inline. Testes unitários: `"escuro"` salvo com o sistema claro → escuro; nada salvo com o sistema escuro → escuro; valor inválido → sistema; `localStorage` que lança erro → sistema, sem exceção
- [x] 2.2 Criar `src/components/theme/theme-toggle.tsx` (D3) com testes de Testing Library e `matchMedia` simulado: "Primeira visita com o sistema escuro" (nome "Usar tema claro"), clique alternando a classe `dark` no `<html>` e gravando `educare-tema` ("Escolha salva"), "Sistema muda com a página aberta" e "Armazenamento bloqueado" (o tema muda sem erro)
- [x] 2.3 Ajustar `src/routes/__root.tsx`: `<html lang="pt-BR" suppressHydrationWarning>`, script de tema no início do `<head>` (comentário sobre CSP), título "Educare" e `ThemeToggle` fixo no canto superior direito. Trocar o conteúdo de `src/routes/index.tsx` por um texto simples em português com as classes do tema ("Educare" e uma frase), sem o "Welcome to TanStack Start". Verificar com `npm run typecheck`

## 3. Verificação integrada

- [ ] 3.1 Com `npm run dev`, conferir manualmente:
  - a página `/` nos dois modos, com as cores da tabela da spec (fundo, texto e um `Button` padrão, inspecionados no DevTools);
  - no modo escuro salvo, com a CPU limitada a 6x no DevTools, recarregar e confirmar que não aparece nenhum quadro claro ("Recarregar no modo escuro");
  - o console sem avisos de hidratação ("Sem avisos de hidratação");
  - a mudança do tema do sistema operacional com a página aberta e sem preferência salva.
- [x] 3.2 Rodar `npm run check -- --write`, `npm run typecheck` e `npm test` e verificar que os três terminam sem erro
