# Spec Delta

## MODIFIED Requirements

### Requirement: Logout
O item "Sair" do menu do usuário e o botão "Sair" da barra lateral SHALL apagar o cookie de sessão, descartar todos os dados da API em cache no navegador, descartar os dados da sessão guardados no servidor do frontend e levar o usuário a `/login`, sem o parâmetro `redirect`. Depois do logout, voltar no histórico do navegador SHALL NOT mostrar dados da sessão encerrada, e quem entrar em seguida no mesmo navegador SHALL NOT ver dados da sessão anterior, nem do cache do navegador nem do servidor do frontend.

#### Scenario: Sair
- **WHEN** a usuária `ana.souza@educare.org`, logada, abre o menu do usuário e escolhe "Sair"
- **THEN** ela é levada a `/login`, e o cookie `educare_session` não existe mais

#### Scenario: Sair pela barra lateral
- **WHEN** a usuária `ana.souza@educare.org`, logada, clica em "Sair" na barra lateral
- **THEN** ela é levada a `/login`, e o cookie `educare_session` não existe mais

#### Scenario: Voltar após sair
- **WHEN** a usuária sai e usa o botão "voltar" do navegador para `/`
- **THEN** ela é levada a `/login?redirect=%2F`, sem ver o nome dela nem outros dados

#### Scenario: Outra pessoa entra no mesmo navegador
- **WHEN** a coordenadora `ana.souza@educare.org` abre as listas de turmas e de usuários, sai, e o educador `carlos.lima@educare.org` entra no mesmo navegador e abre `/criancas`
- **THEN** nenhuma lista da sessão de Ana aparece para Carlos, e as chamadas da sessão de Carlos vão à API com o token dele
