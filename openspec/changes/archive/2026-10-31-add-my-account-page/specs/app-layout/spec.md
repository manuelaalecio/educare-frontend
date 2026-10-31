# Spec Delta

## MODIFIED Requirements

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
