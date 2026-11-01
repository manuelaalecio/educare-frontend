# Proposal

## Why

Hoje as páginas protegidas têm só um cabeçalho com o nome do usuário, "Minha senha" e "Sair", e não há como navegar entre as áreas do sistema. As próximas páginas (alunos, responsáveis, turmas, configurações) precisam de um lugar fixo na interface antes de serem construídas. O modelo aprovado no artefato "Educare — tema verde" (pranchas "Início · desktop claro", "barra lateral recolhida", "celular com menu aberto" e "menu do usuário aberto") define essa estrutura: uma barra lateral de navegação e um menu do usuário no cabeçalho.

## What Changes

- **Barra lateral** em todas as páginas protegidas, com a marca "Educare", o grupo "Menu" ("Início", "Alunos", "Responsáveis", "Turmas") e, no rodapé, "Configurações" (só para `ADMIN`) e "Sair". O item da página atual fica destacado.
- **Recolher e expandir** no desktop: o botão "Recolher menu" / "Expandir menu" no cabeçalho deixa a barra só com ícones (nome do item em tooltip). A escolha vale nas próximas visitas e já chega certa na renderização no servidor.
- **Celular**: a barra vira uma gaveta, aberta pelo botão "Abrir menu" do cabeçalho e fechada por "Fechar menu", pelo fundo escurecido, por `Esc` ou ao escolher um item.
- **Cabeçalho novo**: no desktop, o botão de recolher, o título da página e, à direita, o botão de tema e o menu do usuário. No celular, "Abrir menu", "Educare", o botão de tema e o avatar.
- **Menu do usuário**: o botão com as iniciais, o nome e a role abre um menu com o nome e o email, "Minha conta" (leva a `/minha-conta/senha`) e "Sair".
- **Páginas provisórias** `/alunos`, `/responsaveis`, `/turmas` e `/configuracoes`, com o título da área e o aviso "Esta página ainda está em construção.", para que a navegação funcione de verdade. Cada change futura só preenche a página.
- **Botão de tema** sai do canto fixo da página: nas páginas protegidas, vai para o cabeçalho; no `/login`, continua no canto.
- **Componentes shadcn** `sidebar` (traz `sheet`, `tooltip`, `separator`, `skeleton` e o hook `use-mobile`), `dropdown-menu` e `avatar`.
- **BREAKING (interface)**: o link "Minha senha" e o botão "Sair" saem da barra do cabeçalho; o acesso passa a ser pelo menu do usuário (e "Sair" também pela barra lateral).

## Non-goals

- O conteúdo das páginas Alunos, Responsáveis, Turmas e Configurações (listas, formulários, dados da API). O dashboard da página Início também fica para outra change.
- Proteger a rota `/configuracoes` contra quem não é `ADMIN`: nesta change, só o item da barra lateral é escondido. O controle de acesso entra com a change de Configurações.
- Uma página "Minha conta" além da troca de senha que já existe.
- Busca, notificações, breadcrumbs ou submenus na barra lateral.
- Mudanças no `educare-backend` ou no cliente da API.

## Capabilities

### New Capabilities
- `app-layout`: estrutura das páginas protegidas: barra lateral de navegação (desktop expandida e recolhida, gaveta no celular), cabeçalho com o título da página e o menu do usuário, e as páginas provisórias das áreas.

### Modified Capabilities
- `auth`: o requisito "Usuário logado no cabeçalho" passa a valer para o botão do menu do usuário (no celular, o nome fica no nome acessível e dentro do menu); o requisito "Logout" passa a se referir ao "Sair" do menu do usuário e da barra lateral.

## Impact

- **Código**:
  - `src/routes/_authenticated.tsx` troca o `AppHeader` pelo novo layout (`SidebarProvider` + barra lateral + cabeçalho);
  - novos componentes em `src/components/layout/` (barra lateral, cabeçalho, menu do usuário, itens de navegação, hook de logout); `app-header.tsx` e o teste dele são substituídos;
  - novas rotas `src/routes/_authenticated/{alunos,responsaveis,turmas,configuracoes}.tsx`;
  - `src/routes/__root.tsx` deixa de renderizar o botão de tema fixo; `src/routes/login.tsx` passa a renderizá-lo;
  - componentes shadcn novos em `src/components/ui/`, com o import de `cn` ajustado para o pacote `cn`.
- **Dependências**: nenhuma nova no `package.json` (o `radix-ui` e o `lucide-react` já estão instalados).
- **Cookie novo**: `sidebar_state` (só `true`/`false`, sem dado pessoal), lido no servidor para a barra já abrir no estado certo.
- **Outras changes**: não há changes em andamento. As três changes anteriores (`add-visual-theme`, `add-login-page`, `add-backend-integration`) já foram arquivadas; esta parte das specs `auth` e `visual-theme` resultantes. As changes futuras de Alunos, Responsáveis, Turmas e Configurações dependem desta e substituem as páginas provisórias.
