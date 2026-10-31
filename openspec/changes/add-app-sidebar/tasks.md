# Tasks

## 1. Componentes do shadcn

- [x] 1.1 Rodar `npx shadcn@latest add sidebar dropdown-menu avatar`, recusando sobrescrever `button.tsx` e `input.tsx`, e trocar `#/lib/utils` por `cn` nos arquivos novos (D1). Verificar com `git status` que só surgiram arquivos novos em `src/components/ui/` e `src/hooks/`, e com `npm run typecheck`
- [x] 1.2 Ajustar o `sidebar.tsx` gerado (D1, D8): larguras 16rem / 18rem / 4.75rem, título e descrição do `Sheet` em português ("Menu principal", "Navegação do Educare"), `SidebarMenuButton` com 44 px e ícones de 20 px, `SidebarInset` como `div`, estilo do item ativo com `text-sidebar-primary` e peso 700; um comentário no topo lista esses ajustes para uma reinstalação futura. Verificar com `npm run typecheck` e `npm run check`

## 2. Dados de navegação e do usuário

- [x] 2.1 Criar `src/components/layout/nav-items.ts` com `mainNav`, `footerNav`, `visibleItems`, `isActive` e `pageTitle` (D2), com testes unitários de `isActive` (Início exato, `/alunos/123` ativo, `/alunos-antigos` inativo), `visibleItems` (ADMIN, USER, role desconhecida) e `pageTitle` (cada área, `/minha-conta/senha`, caminho desconhecido). Verificar com `npm test`
- [x] 2.2 Criar `src/components/layout/user.ts` com `initials` e `roleLabel` (movido do `app-header.tsx`) (D6), com testes unitários de `initials` ("Ana Souza", "Ana Maria de Souza", "Administrador", espaços extras, vazio) e de `roleLabel` (ADMIN, USER, desconhecida). Verificar com `npm test`
- [x] 2.3 Criar `src/components/layout/sidebar-state.ts` com `SIDEBAR_COOKIE` e `readSidebarOpen` (`createIsomorphicFn`) (D3), com teste unitário da parte de cliente (sem cookie, `sidebar_state=false`, `sidebar_state=true`). Verificar com `npm test`

## 3. Páginas provisórias

- [x] 3.1 Criar `src/components/layout/under-construction.tsx` e as rotas `src/routes/_authenticated/{alunos,responsaveis,turmas,configuracoes}.tsx` com `head` "<área> · Educare" (D10), e incluí-las como placeholders em `src/testing/render-route.tsx`. Teste de Testing Library para "Página provisória de Alunos" (título e texto). Verificar com `npm test` e que `npm run dev` regenera `routeTree.gen.ts` sem edição à mão

## 4. Logout compartilhado e barra lateral

- [x] 4.1 Criar o hook `src/components/layout/use-sign-out.ts` (D7), extraído do `signOut` do `AppHeader`, com estado `pending`. Verificar com o teste de 4.2
- [x] 4.2 Criar `src/components/layout/app-sidebar.tsx` (D1, D2, D5, D8): marca "Educare" com `Sprout`, rótulo "Menu", itens de `mainNav`, rodapé com `footerNav` filtrado pela role e "Sair" (`useSignOut`), botão "Fechar menu" só no celular, links com `aria-current` e `setOpenMobile(false)` no clique. Testes de Testing Library: "Barra lateral de um ADMIN", "Barra lateral de um USER", "Navegar pela barra", "Item atual na página inicial", "Item atual numa subpágina", "Página fora da barra" e "Sair pela barra lateral" (logout chamado, cache limpo, `/login` sem `redirect`). Verificar com `npm test`

## 5. Cabeçalho e menu do usuário

- [x] 5.1 Criar `src/components/layout/user-menu.tsx` (D6) com `DropdownMenu`, `Avatar`, nome e role em `hidden md:flex`, "Minha conta" e "Sair". Testes de Testing Library: "Botão no desktop" (nome acessível, "AS", nome e role no DOM), "Iniciais de nome com uma palavra", "Abrir o menu" (nome e email), "Ir para Minha conta", "Menu pelo teclado" (`Enter` abre, `Esc` fecha e devolve o foco) e "Sair" da spec `auth` (pelo menu do usuário). Verificar com `npm test`
- [x] 5.2 Criar `src/components/layout/sidebar-collapse-button.tsx` com "Recolher menu" / "Expandir menu" e tooltip (D5). Verificar com o teste de 5.3
- [x] 5.3 Reescrever `src/components/layout/app-header.tsx` com o cabeçalho novo (D4, D5, D9): "Abrir menu" + "Educare" em `md:hidden`; botão de recolher, separador e `pageTitle` em `hidden md:flex`; `ThemeToggle` e `UserMenu` à direita. Reescrever `app-header.test.tsx` (dentro de um `SidebarProvider`, com `matchMedia` simulado): "Cabeçalho no desktop" (título "Turmas"), "Recolher" (nome do botão alterna), "Um único botão de tema" e "Cabeçalho de um ADMIN" / "Cabeçalho de um USER" da spec `auth`. Verificar com `npm test`

## 6. Layout das páginas protegidas e botão de tema

- [x] 6.1 Em `src/routes/_authenticated.tsx`, devolver `sidebarOpen: readSidebarOpen()` no `beforeLoad` e renderizar `SidebarProvider defaultOpen` + `AppSidebar` + `SidebarInset` com `AppHeader` e `Outlet` (D3, D8). Ampliar `src/routes/-authenticated.test.tsx`: barra recolhida quando o `readSidebarOpen` simulado devolve `false`, expandida quando devolve `true`, e "Página provisória exige sessão" (`/turmas` sem sessão vai a `/login?redirect=%2Fturmas`). Verificar com `npm test`
- [x] 6.2 Tirar o `ThemeToggle` do `RootDocument` e renderizá-lo em `src/routes/login.tsx` com `fixed top-4 right-4` (D9). Ampliar `src/routes/-login.test.tsx` com "Botão de tema no login" e "Login sem barra lateral". Verificar com `npm test`
- [x] 6.3 Atualizar o README (seção "Rotas protegidas"): toda página sob `_authenticated/` ganha a barra lateral e o cabeçalho, e um item novo na barra entra em `src/components/layout/nav-items.ts`. Verificar relendo a seção

## 7. Verificação

- [ ] 7.1 Conferência manual com `npm run dev` e o backend local, nos temas claro e escuro (D11): em 1440 px, comparar com as pranchas "Início · desktop claro", "Início · barra lateral recolhida", "Início · modo escuro" e "Início · menu do usuário aberto"; recolher, recarregar e ver no código-fonte da página o `data-state="collapsed"`; tooltips pelo teclado; "Configurações" só com `admin@educare.org`. Em 390 px: cabeçalho sem pulo ao carregar, gaveta fechando por "Fechar menu", fundo, `Esc` e escolhendo um item, com o foco de volta no "Abrir menu". Console sem avisos de hidratação; `/login` com o botão de tema no canto e sem barra
- [x] 7.2 Rodar `npm run check -- --write`, `npm run typecheck` e `npm test` e verificar que os três terminam sem erro
