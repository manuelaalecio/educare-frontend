## MODIFIED Requirements

### Requirement: Barra lateral de navegação
Toda página protegida SHALL ter uma barra lateral com o nome acessível "Menu principal", contendo, de cima para baixo: a marca "Educare"; o rótulo "Menu" seguido dos links "Início" (`/`), "Alunos" (`/alunos`), "Responsáveis" (`/responsaveis`) e "Turmas" (`/turmas`); e, separados no rodapé, o link "Configurações" (`/configuracoes`) e o botão "Sair". O link "Configurações" SHALL aparecer só para usuários com role `COORDENADOR`. A página `/login` SHALL NOT ter a barra lateral.

#### Scenario: Barra lateral de um COORDENADOR
- **WHEN** o usuário `admin@educare.org`, de role `COORDENADOR`, abre `/` numa tela de 1440 px de largura
- **THEN** a barra "Menu principal" mostra "Educare", "Menu", "Início", "Alunos", "Responsáveis", "Turmas", "Configurações" e "Sair", nessa ordem

#### Scenario: Barra lateral de um EDUCADOR
- **WHEN** a usuária `ana.souza@educare.org`, de role `EDUCADOR`, abre `/`
- **THEN** a barra mostra "Início", "Alunos", "Responsáveis", "Turmas" e "Sair", e não mostra "Configurações"

#### Scenario: Barra lateral de um ADMIN
- **WHEN** um usuário com a role antiga `ADMIN` abre `/`
- **THEN** a barra não mostra "Configurações"

#### Scenario: Barra lateral de um USER
- **WHEN** um usuário com a role antiga `USER` abre `/`
- **THEN** a barra não mostra "Configurações"

#### Scenario: Navegar pela barra
- **WHEN** a usuária está em `/` e clica em "Turmas"
- **THEN** ela é levada a `/turmas` sem recarregar a página inteira, e a barra lateral continua visível

#### Scenario: Login sem barra lateral
- **WHEN** um visitante sem sessão abre `/login`
- **THEN** a página não tem a barra "Menu principal"

### Requirement: Menu do usuário
O cabeçalho SHALL ter um botão com as iniciais do usuário da sessão num avatar e o nome acessível "Menu do usuário: <nome>". Em telas com 768 px ou mais, o botão SHALL mostrar também o nome e a função ("Coordenador(a)" para `COORDENADOR`, "Educador(a)" para `EDUCADOR`, uma role desconhecida como veio). As iniciais SHALL ser a primeira letra da primeira e da última palavra do nome, em maiúsculas, ou as duas primeiras letras quando o nome tem uma palavra só. O botão SHALL abrir um menu com o nome acessível "Menu do usuário", contendo o nome e o email (login) do usuário, um separador, o item "Minha conta", que leva a `/minha-conta`, e o item "Sair", em vermelho. O menu SHALL abrir pelo clique e pelo teclado (`Enter`, `Espaço` ou seta para baixo), permitir mover entre os itens com as setas e fechar com `Esc`, com um clique fora ou ao escolher um item, devolvendo o foco ao botão.

#### Scenario: Botão no desktop
- **WHEN** a usuária `ana.souza@educare.org`, de nome `Ana Souza` e role `EDUCADOR`, abre `/` numa tela de 1440 px
- **THEN** o botão "Menu do usuário: Ana Souza" mostra "AS", "Ana Souza" e "Educador(a)"

#### Scenario: Função de um COORDENADOR
- **WHEN** um usuário de role `COORDENADOR` abre `/` numa tela de 1440 px
- **THEN** o botão do menu do usuário mostra "Coordenador(a)"

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
