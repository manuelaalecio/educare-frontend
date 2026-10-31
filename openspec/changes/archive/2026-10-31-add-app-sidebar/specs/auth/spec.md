# Spec Delta

## MODIFIED Requirements

### Requirement: Usuário logado no cabeçalho
Toda página protegida SHALL mostrar no cabeçalho, no botão do menu do usuário, o nome do usuário da sessão e a role dele ("Administrador" para `ADMIN`, "Funcionário" para `USER`), obtidos de `GET /api/v1/auth/me` pelo servidor do frontend. Em telas com menos de 768 px de largura, o botão SHALL mostrar só as iniciais, e o nome SHALL continuar no nome acessível do botão e dentro do menu do usuário. Os dados SHALL refletir o estado atual da API a cada carregamento completo da página.

#### Scenario: Cabeçalho de um ADMIN
- **WHEN** o usuário `admin@educare.org`, de nome `Administrador` e role `ADMIN`, abre `/` numa tela de 1440 px
- **THEN** o botão do menu do usuário mostra "Administrador" como nome e "Administrador" como role

#### Scenario: Cabeçalho de um USER
- **WHEN** a usuária `ana.souza@educare.org`, de nome `Ana Souza` e role `USER`, abre `/` numa tela de 1440 px
- **THEN** o botão do menu do usuário mostra "Ana Souza" e "Funcionário"

#### Scenario: Cabeçalho no celular
- **WHEN** a usuária `ana.souza@educare.org` abre `/` numa tela de 390 px
- **THEN** o botão do menu do usuário mostra "AS" e tem o nome acessível "Menu do usuário: Ana Souza"

### Requirement: Logout
O item "Sair" do menu do usuário e o botão "Sair" da barra lateral SHALL apagar o cookie de sessão, descartar todos os dados da API em cache no navegador e levar o usuário a `/login`, sem o parâmetro `redirect`. Depois do logout, voltar no histórico do navegador SHALL NOT mostrar dados da sessão encerrada.

#### Scenario: Sair
- **WHEN** a usuária `ana.souza@educare.org`, logada, abre o menu do usuário e escolhe "Sair"
- **THEN** ela é levada a `/login`, e o cookie `educare_session` não existe mais

#### Scenario: Sair pela barra lateral
- **WHEN** a usuária `ana.souza@educare.org`, logada, clica em "Sair" na barra lateral
- **THEN** ela é levada a `/login`, e o cookie `educare_session` não existe mais

#### Scenario: Voltar após sair
- **WHEN** a usuária sai e usa o botão "voltar" do navegador para `/`
- **THEN** ela é levada a `/login?redirect=%2F`, sem ver o nome dela nem outros dados
