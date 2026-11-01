# Design

## Context

- `src/routes/_authenticated.tsx` faz a checagem de sessão no `beforeLoad`, devolve `{ user }` no contexto e renderiza `<AppHeader user={user} />` + `<Outlet />`. O `AppHeader` (`src/components/layout/app-header.tsx`) tem o nome, a role (`roleLabel`), o link "Minha senha" e o "Sair", com o logout (`logout` → `queryClient.clear()` → `navigate("/login")` → `router.invalidate()`).
- `src/routes/__root.tsx` renderiza `<ThemeToggle className="fixed top-4 right-4" />` em todas as páginas; o `AppHeader` tem `pr-16` só para não ficar embaixo dele.
- `src/styles.css` já tem os tokens `--sidebar-*` do shadcn (claro e escuro) definidos pela `add-visual-theme`, mas o componente `sidebar` ainda não foi instalado. Os componentes de `src/components/ui/` importam `cn` do pacote `cn`; o `components.json` aponta `utils` para `#/lib/utils`, que não existe, então todo `npx shadcn add` exige ajustar esse import.
- O projeto é SSR. O servidor não sabe a largura da tela, e o hook `use-mobile` do shadcn devolve `false` até montar.
- O modelo aprovado está no artefato "Educare — tema verde" (prancha `Dashboard.dc.html`): barra de 256 px (76 px recolhida, 288 px na gaveta do celular), itens com 44 px de altura e ícones de 20 px, menu do usuário de 248 px alinhado à direita do botão.

## Goals / Non-Goals

**Goals:**
- Usar o `Sidebar` do shadcn sem reescrevê-lo, para que as próximas páginas só precisem de uma rota nova e de uma linha na lista de itens.
- Barra no estado certo já no HTML do servidor (sem "pulo" ao hidratar) e sem avisos de hidratação.
- Uma única lista de itens de navegação, usada pela barra, pelo destaque do item atual e pelo título do cabeçalho.

**Non-Goals:**
- Permissões além de esconder "Configurações" de quem não é `ADMIN` (ver proposal.md - Non-goals).
- Animações além das que o `Sidebar` e o `Sheet` do shadcn já trazem.

## Decisions

### D1. Componente `Sidebar` do shadcn
Instalar com `npx shadcn@latest add sidebar dropdown-menu avatar` (o `sidebar` traz `sheet`, `tooltip`, `separator`, `skeleton`, `input` e `hooks/use-mobile`). Depois de instalar, trocar `import { cn } from "#/lib/utils"` por `import { cn } from "cn"` nos arquivos novos e conferir que o `button` e o `input` existentes não foram sobrescritos (responder "não" à pergunta de sobrescrever, ou restaurar com `git checkout`).

Ajustes nos componentes gerados, mínimos e comentados:
- `--sidebar-width: 16rem` (256 px), `--sidebar-width-mobile: 18rem` (288 px) e `--sidebar-width-icon: 4.75rem` (76 px), para bater com o modelo. O padrão de 3 rem do shadcn não comporta o ícone de 36 px da marca com o respiro do modelo.
- No `Sheet` do celular, o título escondido passa de "Sidebar" para "Menu principal" e a descrição para "Navegação do Educare".
- `SidebarMenuButton` com altura de 44 px (`h-11`, alvo de toque mínimo) e ícones de 20 px.

**Alternativa descartada:** escrever a barra do zero com `aside` + estado próprio. Seria preciso refazer a gaveta acessível (foco preso, `Esc`, fundo), os tooltips da barra recolhida, o atalho e o cookie, que o shadcn já resolve e testa.

### D2. Lista única de itens de navegação
`src/components/layout/nav-items.ts` exporta os itens como dados:

```ts
type NavItem = { title: string; to: string; icon: LucideIcon; exact?: boolean; roles?: string[] };
export const mainNav: NavItem[]   // Início (exact), Alunos, Responsáveis, Turmas
export const footerNav: NavItem[] // Configurações (roles: ["ADMIN"])
```

Ícones do `lucide-react`, os mesmos do modelo: `House`, `Users`, `Contact` (o calendário com pessoa do modelo), `LayoutGrid`, `Settings`, `LogOut`, e `Sprout` na marca. Funções puras no mesmo arquivo:
- `visibleItems(items, role)`: filtra por `roles`.
- `isActive(item, pathname)`: `exact` compara igualdade; os demais aceitam `pathname === to || pathname.startsWith(to + "/")` (assim `/alunos-antigos` não acende "Alunos").
- `pageTitle(pathname)`: o `title` do item ativo, ou "Minha conta" para caminhos sob `/minha-conta`, ou "Educare" como fallback.

O link usa o `Link` do TanStack Router dentro de `SidebarMenuButton asChild`, com `aria-current="page"` e `isActive` calculados por `isActive(item, location.pathname)` (`useRouterState({ select: s => s.location.pathname })`).

**Alternativas descartadas:**
- `activeProps` do `Link` do router: resolve o `aria-current`, mas não o título do cabeçalho, e a regra de "exato só no Início" ficaria espalhada em cada link.
- Título por `staticData` em cada rota: exige declarar o tipo de `staticData` no router e repetir o nome em dois lugares; a lista única já sabe o título.

### D3. Estado recolhido em cookie lido no SSR
O `SidebarProvider` do shadcn já grava o cookie `sidebar_state` (`true`/`false`, `path=/`, `max-age` de 7 dias) a cada troca, mas só lê `defaultOpen` por prop. A leitura fica numa função isomórfica em `src/components/layout/sidebar-state.ts`:

```ts
export const readSidebarOpen = createIsomorphicFn()
  .server(() => getCookie(SIDEBAR_COOKIE) !== "false")
  .client(() => !document.cookie.split("; ").includes(`${SIDEBAR_COOKIE}=false`));
```

O `beforeLoad` de `_authenticated.tsx` devolve `{ user, sidebarOpen: readSidebarOpen() }`, e o layout passa `defaultOpen={sidebarOpen}` ao `SidebarProvider`. Sem cookie, a barra começa expandida. A parte de servidor importa `getCookie` de `@tanstack/react-start/server`, que o compilador do Start tira do bundle do navegador.

**Alternativas descartadas:**
- `localStorage` + script inline, como o tema: funciona, mas o tema precisa de script porque depende do sistema operacional; aqui o servidor pode decidir sozinho, e o shadcn já usa cookie.
- Server function `getSidebarState`: uma requisição a mais em cada navegação no cliente, para ler um cookie que o navegador já tem.

### D4. Desktop e celular por CSS, não por `useIsMobile`
Tudo o que muda entre desktop e celular no cabeçalho é decidido por classes `md:` (768 px, o mesmo ponto do `use-mobile`): o botão "Abrir menu" e a marca ficam `md:hidden`; o botão "Recolher menu", o separador, o título e o nome/role do menu do usuário ficam `hidden md:flex`. Assim o HTML do servidor já está certo nas duas larguras e não há aviso de hidratação. O `useIsMobile` fica só onde o próprio shadcn o usa (escolher entre `Sheet` e barra fixa, o que só acontece depois de uma interação).

**Alternativa descartada:** renderizar condicionalmente com `useIsMobile()`. No primeiro quadro do celular apareceria o cabeçalho do desktop, trocado em seguida.

### D5. Botões do cabeçalho
- **Recolher** (`src/components/layout/sidebar-collapse-button.tsx`): um `Button` `ghost` `size="icon"` com `PanelLeft`, que chama `toggleSidebar()` do `useSidebar()` e tem `aria-label`/tooltip "Recolher menu" ou "Expandir menu" conforme `state`. Não usa o `SidebarTrigger` pronto porque ele tem o rótulo fixo "Toggle Sidebar".
- **Abrir menu**: outro `Button` com `Menu`, que chama `setOpenMobile(true)`, `aria-label="Abrir menu"`.
- **Fechar menu**: dentro do `SidebarHeader`, ao lado da marca, visível só quando `isMobile` (está dentro do `Sheet`, que só existe no celular), chama `setOpenMobile(false)`. O `Sheet` (Radix Dialog) já devolve o foco ao botão que o abriu e fecha com `Esc` e com o clique no fundo.
- **Fechar ao navegar**: o `onClick` de cada link da barra chama `setOpenMobile(false)`.
- O atalho `Ctrl/Cmd + B` do shadcn continua ativo; não aparece na interface.

### D6. Menu do usuário com `DropdownMenu`
`src/components/layout/user-menu.tsx`, sobre o `DropdownMenu` do shadcn (Radix), que já resolve `role="menu"`, teclado, foco e fechamento pedidos na spec. Estrutura:
- Gatilho: `Button` `ghost` com `Avatar` + `AvatarFallback` (iniciais, fundo `sage-200`/`sage-800`, texto `sage-700`/`sage-300`), e, num `span` `hidden md:flex`, o nome e `roleLabel(role)`, mais o `ChevronDown`. `aria-label="Menu do usuário: {nome}"`.
- Conteúdo (`align="end"`, `w-62` ≈ 248 px, `aria-label="Menu do usuário"`): `DropdownMenuLabel` com nome e `login`; `DropdownMenuSeparator`; `DropdownMenuItem asChild` com `Link to="/minha-conta/senha"` e o ícone `UserRound` ("Minha conta"); `DropdownMenuItem variant="destructive"` com `LogOut` ("Sair").
- `initials(name)` e `roleLabel(role)` ficam em `src/components/layout/user.ts` (o `roleLabel` sai do `app-header.tsx`). `initials` divide o nome por espaços, ignora vazios, e usa primeira + última palavra, ou as duas primeiras letras de uma palavra só; nome vazio dá `"?"`.
- O avatar mostra só as iniciais: a API não tem foto, e o modelo também não.

**Alternativa descartada:** `Popover` com links. Não é um menu para leitores de tela e não navega pelas setas.

### D7. Logout compartilhado
A lógica do `signOut` do `AppHeader` vira o hook `useSignOut()` em `src/components/layout/use-sign-out.ts`, usado pelo "Sair" da barra e pelo do menu do usuário. A ordem continua a mesma (`logout` → `queryClient.clear()` → `navigate({ to: "/login" })` → `router.invalidate()`), que é o que garante o `/login` sem `?redirect=` e o "voltar" sem dados. O hook também evita um segundo clique enquanto o primeiro não termina (estado `pending`, botões desabilitados).

### D8. Layout e cores
`_authenticated.tsx` passa a renderizar:

```tsx
<SidebarProvider defaultOpen={sidebarOpen}>
  <AppSidebar user={user} />
  <SidebarInset>
    <AppHeader user={user} />  {/* novo, h-16, border-b */}
    <Outlet />
  </SidebarInset>
</SidebarProvider>
```

- O antigo `app-header.tsx` é reescrito com o novo cabeçalho (mesmo nome de arquivo, conteúdo novo); o teste dele é reescrito junto.
- As páginas continuam com o próprio `<main>`: o `SidebarInset` é uma `div` aqui (o shadcn o gera como `main`, e trocamos para `div` para não haver dois `main` aninhados).
- Cores pelos tokens `--sidebar-*` que já existem. O item ativo usa `--sidebar-accent` (`sage-100` no claro, `sage-800` no escuro) com texto `--sidebar-primary` em peso 700 (`data-[active=true]:text-sidebar-primary`). O modelo usa `sage-200` no fundo do ativo, mas o `emerald-700` sobre `sage-200` dá 4,34:1, abaixo dos 4,5:1 da spec; sobre `sage-100` dá 4,92:1. No escuro, `emerald-500` sobre `sage-800` passa folgado. Itens inativos usam `sage-700` no claro e `sage-300` no escuro (9,6:1 e 11:1). O rótulo "Menu" usa `--muted-foreground` (4,9:1 sobre `sage-50`).
- "Sair" no menu do usuário usa `--destructive` (4,8:1 sobre branco, 6,2:1 sobre `sage-900`). Na barra lateral, "Sair" tem a cor dos itens comuns, como no modelo.

### D9. Botão de tema
`RootDocument` deixa de renderizar o `ThemeToggle`. O cabeçalho novo o renderiza à direita, e `src/routes/login.tsx` o renderiza com `className="fixed top-4 right-4"`, como hoje. O `pr-16` do cabeçalho antigo deixa de ser necessário. O requisito "Escolha do tema" (toda página tem o botão) continua atendido, então a spec `visual-theme` não muda.

### D10. Páginas provisórias
Quatro rotas em `src/routes/_authenticated/` (`alunos.tsx`, `responsaveis.tsx`, `turmas.tsx`, `configuracoes.tsx`), cada uma com `head` "<área> · Educare" e um componente `UnderConstruction` (`src/components/layout/under-construction.tsx`) que recebe o título e mostra o `h1` e "Esta página ainda está em construção.". Arquivos simples (não `alunos/index.tsx`) porque a change de cada área decide sua estrutura de pastas.

### D11. Testes
- **Unitário (Vitest)**:
  - `nav-items.ts`: `isActive` (Início exato; `/alunos` e `/alunos/123` ativos; `/alunos-antigos` inativo), `visibleItems` (ADMIN vê Configurações, USER não, role desconhecida não), `pageTitle` (cada área, `/minha-conta/senha`, caminho desconhecido).
  - `user.ts`: `initials` ("Ana Souza" → "AS", "Ana Maria de Souza" → "AS", "Administrador" → "AD", espaços extras, nome vazio → "?") e `roleLabel`.
  - `sidebar-state.ts`: a parte de cliente com `document.cookie` sem cookie, com `sidebar_state=false` e com `sidebar_state=true`.
- **Testing Library** (com `renderRoutes` de `src/testing/render-route.tsx`, ampliado com as rotas provisórias):
  - `AppSidebar`: itens de ADMIN e de USER, `aria-current` no item da rota atual, navegação ao clicar, "Sair" chamando o logout e indo ao `/login` sem `redirect` e com o cache limpo.
  - `AppHeader`: título da página, "Recolher menu" ↔ "Expandir menu" ao clicar, um único botão de tema.
  - `UserMenu`: nome acessível do gatilho, iniciais, nome e role; abrir pelo clique e por `Enter`; "Minha conta" levando a `/minha-conta/senha`; "Sair" do menu.
  - Rota `_authenticated` (`src/routes/-authenticated.test.tsx`): o `defaultOpen` segue o `readSidebarOpen` simulado.
  - O jsdom não tem `matchMedia` nem layout: o teste simula `matchMedia` (como em `theme-toggle.test.tsx`) e não verifica o que é só CSS (`md:hidden`).
- **Manual** (`npm run dev`, nos dois temas):
  - 1440 px: comparar com as pranchas "Início · desktop claro", "barra lateral recolhida", "modo escuro" e "menu do usuário aberto"; recolher, recarregar e conferir no "ver código-fonte" que o HTML já vem com `data-state="collapsed"`; tooltips na barra recolhida pelo teclado.
  - 390 px (DevTools): cabeçalho do celular sem pulo ao carregar; abrir a gaveta, fechar por "Fechar menu", fundo, `Esc` e escolhendo um item; foco volta ao "Abrir menu".
  - Console sem avisos de hidratação; `/login` com o botão de tema no canto e sem barra.

## Risks / Trade-offs

- [O `npx shadcn add sidebar` pode tentar sobrescrever `button.tsx` e `input.tsx`] → recusar a sobrescrita; a tarefa confere com `git diff` que só arquivos novos apareceram.
- [Componentes do shadcn ajustados à mão (larguras, título do `Sheet`, altura dos itens)] → ajustes poucos e comentados; uma reinstalação futura precisa refazê-los, o que a tarefa anota no topo do arquivo.
- [Cookie `sidebar_state` sem `Secure`/`SameSite` explícitos, gravado pelo shadcn via `document.cookie`] → guarda só `true`/`false`, sem dado pessoal nem de sessão; o navegador aplica `SameSite=Lax` por padrão.
- [`/configuracoes` acessível a um USER que digitar o endereço] → a página provisória não tem dados; a proteção entra com a change de Configurações (proposal.md - Non-goals).
- [Fundo do item ativo diferente do modelo (`sage-100` em vez de `sage-200`)] → necessário para o contraste de 4,5:1; a diferença é sutil e o peso 700 + a cor verde continuam marcando o item.

## Migration Plan

Sem migração de dados. O cookie `sidebar_state` é novo; sem ele, a barra abre expandida. Rollback: reverter o commit.
