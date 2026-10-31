# app-layout Specification

## Purpose

Dar às páginas protegidas do Educare uma estrutura comum: uma barra lateral para navegar entre as áreas do sistema e um cabeçalho com o título da página, o botão de tema e o menu do usuário, no desktop e no celular.

## Requirements

### Requirement: Barra lateral de navegação
Toda página protegida SHALL ter uma barra lateral com o nome acessível "Menu principal", contendo, de cima para baixo: a marca "Educare"; o rótulo "Menu" seguido dos links "Início" (`/`), "Alunos" (`/alunos`), "Responsáveis" (`/responsaveis`) e "Turmas" (`/turmas`); e, separados no rodapé, o link "Configurações" (`/configuracoes`) e o botão "Sair". O link "Configurações" SHALL aparecer só para usuários com role `ADMIN`. A página `/login` SHALL NOT ter a barra lateral.

#### Scenario: Barra lateral de um ADMIN
- **WHEN** o usuário `admin@educare.org`, de role `ADMIN`, abre `/` numa tela de 1440 px de largura
- **THEN** a barra "Menu principal" mostra "Educare", "Menu", "Início", "Alunos", "Responsáveis", "Turmas", "Configurações" e "Sair", nessa ordem

#### Scenario: Barra lateral de um USER
- **WHEN** a usuária `ana.souza@educare.org`, de role `USER`, abre `/`
- **THEN** a barra mostra "Início", "Alunos", "Responsáveis", "Turmas" e "Sair", e não mostra "Configurações"

#### Scenario: Navegar pela barra
- **WHEN** a usuária está em `/` e clica em "Turmas"
- **THEN** ela é levada a `/turmas` sem recarregar a página inteira, e a barra lateral continua visível

#### Scenario: Login sem barra lateral
- **WHEN** um visitante sem sessão abre `/login`
- **THEN** a página não tem a barra "Menu principal"

### Requirement: Item da página atual
O link da barra lateral correspondente à página atual SHALL ter `aria-current="page"` e destaque visual (fundo e cor de texto diferentes dos demais itens, com contraste de pelo menos 4,5:1 nos dois modos). "Início" SHALL ser o item atual só em `/`; cada um dos outros itens SHALL ser o item atual no próprio caminho e em qualquer caminho abaixo dele (por exemplo, "Alunos" em `/alunos/123`). Nenhum item SHALL estar destacado em páginas que não correspondem a um item, como `/minha-conta`.

#### Scenario: Item atual na página inicial
- **WHEN** a usuária abre `/`
- **THEN** só o link "Início" tem `aria-current="page"`

#### Scenario: Item atual numa subpágina
- **WHEN** a usuária abre `/alunos/123`
- **THEN** só o link "Alunos" tem `aria-current="page"`

#### Scenario: Página fora da barra
- **WHEN** a usuária abre `/minha-conta`
- **THEN** nenhum link da barra lateral tem `aria-current="page"`

### Requirement: Recolher a barra lateral no desktop
Em telas com 768 px de largura ou mais, o cabeçalho SHALL ter um botão com o nome acessível "Recolher menu" quando a barra está expandida e "Expandir menu" quando está recolhida. Recolhida, a barra SHALL mostrar só os ícones dos itens e da marca, sem os textos e sem o rótulo "Menu"; cada item SHALL manter o nome acessível e mostrar o nome num tooltip ao receber o ponteiro ou o foco do teclado. A escolha SHALL ser lembrada pelo navegador por pelo menos 7 dias e SHALL já estar aplicada no HTML vindo do servidor, de forma que a barra nunca apareça expandida e depois recolha. Sem escolha salva, a barra SHALL começar expandida.

#### Scenario: Recolher
- **WHEN** a usuária, com a barra expandida numa tela de 1440 px, clica em "Recolher menu"
- **THEN** a barra mostra só os ícones, o botão passa a se chamar "Expandir menu", e o link "Alunos" continua com o nome acessível "Alunos"

#### Scenario: Tooltip na barra recolhida
- **WHEN** a barra está recolhida e a usuária leva o foco do teclado ao link "Turmas"
- **THEN** aparece um tooltip com o texto "Turmas"

#### Scenario: Escolha lembrada
- **WHEN** a usuária recolhe a barra e depois recarrega a página
- **THEN** o HTML servido já traz a barra recolhida, e o botão se chama "Expandir menu"

#### Scenario: Primeira visita
- **WHEN** um usuário sem escolha salva abre `/` numa tela de 1440 px
- **THEN** a barra aparece expandida, com os textos dos itens

### Requirement: Menu no celular
Em telas com menos de 768 px de largura, a barra lateral SHALL ficar escondida, e o cabeçalho SHALL mostrar o botão "Abrir menu" seguido da marca "Educare". O botão SHALL abrir a barra como uma gaveta sobre a página, com fundo escurecido, com os mesmos itens da barra do desktop, com textos, e um botão "Fechar menu". A gaveta SHALL fechar ao clicar em "Fechar menu", ao clicar no fundo escurecido, ao apertar `Esc` ou ao escolher um link; ao fechar, o foco SHALL voltar ao botão "Abrir menu". O botão "Recolher menu" SHALL NOT aparecer no celular.

#### Scenario: Abrir a gaveta
- **WHEN** a usuária abre `/` numa tela de 390 px e clica em "Abrir menu"
- **THEN** a gaveta aparece com "Educare", "Fechar menu", "Início", "Alunos", "Responsáveis", "Turmas" e "Sair"

#### Scenario: Escolher um item fecha a gaveta
- **WHEN** a gaveta está aberta e a usuária clica em "Responsáveis"
- **THEN** ela é levada a `/responsaveis`, e a gaveta fecha

#### Scenario: Fechar com Esc
- **WHEN** a gaveta está aberta e a usuária aperta `Esc`
- **THEN** a gaveta fecha, e o foco volta ao botão "Abrir menu"

#### Scenario: Sem botão de recolher no celular
- **WHEN** a usuária abre `/` numa tela de 390 px
- **THEN** o cabeçalho não tem o botão "Recolher menu"

### Requirement: Cabeçalho das páginas protegidas
Toda página protegida SHALL ter um cabeçalho. Em telas com 768 px ou mais, ele SHALL mostrar, à esquerda, o botão de recolher (ver "Recolher a barra lateral no desktop") e o título da área atual; à direita, o botão de tema (com os nomes acessíveis "Usar tema escuro" e "Usar tema claro") e o botão do menu do usuário. O título SHALL ser "Início" em `/`, "Alunos" em `/alunos`, "Responsáveis" em `/responsaveis`, "Turmas" em `/turmas`, "Configurações" em `/configuracoes` e "Minha conta" em `/minha-conta`. Nas páginas protegidas, o botão de tema SHALL ficar só no cabeçalho; no `/login`, SHALL continuar no canto superior direito da página.

#### Scenario: Cabeçalho no desktop
- **WHEN** a usuária abre `/turmas` numa tela de 1440 px no modo claro
- **THEN** o cabeçalho mostra "Recolher menu", o título "Turmas", o botão "Usar tema escuro" e o botão do menu do usuário

#### Scenario: Título em Minha conta
- **WHEN** a usuária abre `/minha-conta` numa tela de 1440 px
- **THEN** o cabeçalho mostra o título "Minha conta"

#### Scenario: Um único botão de tema
- **WHEN** a usuária abre `/` com sessão
- **THEN** a página tem exatamente um botão com o nome "Usar tema escuro" ou "Usar tema claro", dentro do cabeçalho

#### Scenario: Botão de tema no login
- **WHEN** um visitante sem sessão abre `/login`
- **THEN** a página tem o botão de tema no canto superior direito

### Requirement: Menu do usuário
O cabeçalho SHALL ter um botão com as iniciais do usuário da sessão num avatar e o nome acessível "Menu do usuário: <nome>". Em telas com 768 px ou mais, o botão SHALL mostrar também o nome e a role ("Administrador" para `ADMIN`, "Funcionário" para `USER`, uma role desconhecida como veio). As iniciais SHALL ser a primeira letra da primeira e da última palavra do nome, em maiúsculas, ou as duas primeiras letras quando o nome tem uma palavra só. O botão SHALL abrir um menu com o nome acessível "Menu do usuário", contendo o nome e o email (login) do usuário, um separador, o item "Minha conta", que leva a `/minha-conta`, e o item "Sair", em vermelho. O menu SHALL abrir pelo clique e pelo teclado (`Enter`, `Espaço` ou seta para baixo), permitir mover entre os itens com as setas e fechar com `Esc`, com um clique fora ou ao escolher um item, devolvendo o foco ao botão.

#### Scenario: Botão no desktop
- **WHEN** a usuária `ana.souza@educare.org`, de nome `Ana Souza` e role `USER`, abre `/` numa tela de 1440 px
- **THEN** o botão "Menu do usuário: Ana Souza" mostra "AS", "Ana Souza" e "Funcionário"

#### Scenario: Botão no celular
- **WHEN** a mesma usuária abre `/` numa tela de 390 px
- **THEN** o botão "Menu do usuário: Ana Souza" mostra só "AS"

#### Scenario: Iniciais de nome com uma palavra
- **WHEN** o usuário de nome `Administrador` abre `/`
- **THEN** o avatar mostra "AD"

#### Scenario: Abrir o menu
- **WHEN** a usuária clica em "Menu do usuário: Ana Souza"
- **THEN** abre o menu "Menu do usuário" com "Ana Souza", "ana.souza@educare.org", "Minha conta" e "Sair"

#### Scenario: Ir para Minha conta
- **WHEN** o menu está aberto e a usuária escolhe "Minha conta"
- **THEN** ela é levada a `/minha-conta`, e o menu fecha

#### Scenario: Menu pelo teclado
- **WHEN** o foco está no botão do menu do usuário e a usuária aperta `Enter`, depois seta para baixo e `Esc`
- **THEN** o menu abre, o foco passa entre os itens, e ao apertar `Esc` o menu fecha com o foco de volta no botão

### Requirement: Páginas provisórias das áreas
As páginas `/alunos`, `/responsaveis`, `/turmas` e `/configuracoes` SHALL existir como páginas protegidas, cada uma com um título de nível 1 igual ao nome da área ("Alunos", "Responsáveis", "Turmas", "Configurações"), o texto "Esta página ainda está em construção." e o título de aba "<área> · Educare". Elas SHALL NOT buscar dados na API.

#### Scenario: Página provisória de Alunos
- **WHEN** a usuária abre `/alunos`
- **THEN** a página mostra o título "Alunos" e "Esta página ainda está em construção.", e a aba do navegador se chama "Alunos · Educare"

#### Scenario: Página provisória exige sessão
- **WHEN** um visitante sem sessão abre `/turmas`
- **THEN** ele é levado a `/login?redirect=%2Fturmas`
