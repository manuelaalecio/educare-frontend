# Spec Delta

## Purpose

Permitir que os funcionários entrem e saiam do sistema com email e senha, mantendo a sessão num cookie protegido, e garantir que nenhuma página com dados apareça sem um usuário autenticado.

## ADDED Requirements

### Requirement: Login com email e senha
A página `/login` SHALL ter um formulário com "Email" e "Senha". Antes de enviar, o formulário SHALL exigir os dois campos preenchidos, email com no máximo 254 caracteres e senha com no máximo 72 bytes em UTF-8, e mostrar o erro junto ao campo, sem chamar a API. No envio, o servidor do frontend SHALL chamar `POST /api/v1/auth/login` da API. Com `200 OK`, SHALL gravar o `accessToken` no cookie de sessão (ver "Cookie de sessão protegido") e levar o usuário ao destino de "Volta à página pedida". Com `401`, SHALL mostrar "Email ou senha inválidos." e limpar só o campo de senha. Enquanto o envio estiver em andamento, o botão "Entrar" SHALL ficar desabilitado.

#### Scenario: Login com sucesso
- **WHEN** existe a usuária `ana.souza@educare.org` com senha `segredo123`, e ela preenche o formulário de `/login` com esses dados e clica em "Entrar"
- **THEN** ela é levada a `/`, e o cabeçalho mostra "Ana Souza"

#### Scenario: Credenciais inválidas
- **WHEN** a usuária preenche `ana.souza@educare.org` e a senha `errada123` e clica em "Entrar"
- **THEN** a página continua em `/login` e mostra "Email ou senha inválidos.", o campo de email mantém `ana.souza@educare.org`, o campo de senha fica vazio, e nenhum cookie de sessão é gravado

#### Scenario: Campos vazios
- **WHEN** a usuária clica em "Entrar" com os dois campos vazios
- **THEN** aparece um erro junto a "Email" e outro junto a "Senha", e nenhuma requisição é feita à API

#### Scenario: Senha acima de 72 bytes
- **WHEN** a usuária preenche uma senha com 40 caracteres `ç` (80 bytes em UTF-8) e clica em "Entrar"
- **THEN** aparece um erro junto a "Senha", e nenhuma requisição é feita à API

#### Scenario: API indisponível no login
- **WHEN** a API não responde, e a usuária envia credenciais válidas
- **THEN** a página mostra "Não foi possível falar com o servidor. Tente de novo em instantes.", e nenhum cookie de sessão é gravado

### Requirement: Cookie de sessão protegido
O token da sessão SHALL ser guardado num único cookie `educare_session` com `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` em produção e `Max-Age` igual ao `expiresIn` devolvido pela API (28800 segundos). O cookie SHALL conter só o token, sem dados pessoais adicionais.

#### Scenario: Atributos do cookie em produção
- **WHEN** um usuário faz login com sucesso em produção e a API devolve `"expiresIn": 28800`
- **THEN** a resposta grava `educare_session` com `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` e `Max-Age=28800`

#### Scenario: Cookie em desenvolvimento
- **WHEN** um usuário faz login com sucesso em desenvolvimento, em `http://localhost:3000`
- **THEN** o cookie `educare_session` é gravado sem `Secure`, com os demais atributos iguais aos de produção

### Requirement: Rotas protegidas por padrão
Toda página SHALL exigir sessão, exceto `/login`. Sem cookie de sessão, o acesso a uma página protegida SHALL levar a `/login?redirect=<caminho pedido>` antes de renderizar qualquer dado da página, inclusive na renderização no servidor. Um usuário com sessão que abre `/login` SHALL ser levado a `/`.

#### Scenario: Acesso sem sessão
- **WHEN** um visitante sem cookie de sessão abre `/minha-conta/senha`
- **THEN** ele é levado a `/login?redirect=%2Fminha-conta%2Fsenha`, e o HTML servido não contém o formulário de troca de senha

#### Scenario: Usuário logado abre o login
- **WHEN** um usuário com sessão válida abre `/login`
- **THEN** ele é levado a `/`

### Requirement: Volta à página pedida
Depois do login, o usuário SHALL ser levado ao caminho do parâmetro `redirect` quando ele for um caminho interno: começa com `/`, não começa com `//` nem com `/\` e não é `/login`. Em qualquer outro caso, inclusive sem o parâmetro, SHALL ser levado a `/`.

#### Scenario: Volta para a página pedida
- **WHEN** a usuária abre `/login?redirect=%2Fminha-conta%2Fsenha` e faz login com sucesso
- **THEN** ela é levada a `/minha-conta/senha`

#### Scenario: Redirect externo ignorado
- **WHEN** a usuária abre `/login?redirect=https%3A%2F%2Fmalicioso.example` ou `/login?redirect=%2F%2Fmalicioso.example` e faz login com sucesso
- **THEN** ela é levada a `/`

### Requirement: Sessão expirada informada
Quando o usuário chega a `/login` com `motivo=sessao-expirada`, a página SHALL mostrar "Sua sessão expirou. Entre de novo para continuar.".

#### Scenario: Aviso de sessão expirada
- **WHEN** a usuária abre `/login?redirect=%2F&motivo=sessao-expirada`
- **THEN** a página mostra "Sua sessão expirou. Entre de novo para continuar." acima do formulário

#### Scenario: Login normal sem aviso
- **WHEN** a usuária abre `/login` sem o parâmetro `motivo`
- **THEN** a página não mostra o aviso de sessão expirada

### Requirement: Usuário logado no cabeçalho
Toda página protegida SHALL mostrar no cabeçalho o nome do usuário da sessão e a role dele ("Administrador" para `ADMIN`, "Funcionário" para `USER`), obtidos de `GET /api/v1/auth/me` pelo servidor do frontend. Os dados SHALL refletir o estado atual da API a cada carregamento completo da página.

#### Scenario: Cabeçalho de um ADMIN
- **WHEN** o usuário `admin@educare.org`, de nome `Administrador` e role `ADMIN`, abre `/`
- **THEN** o cabeçalho mostra "Administrador" como nome e "Administrador" como role

#### Scenario: Cabeçalho de um USER
- **WHEN** a usuária `ana.souza@educare.org`, de nome `Ana Souza` e role `USER`, abre `/`
- **THEN** o cabeçalho mostra "Ana Souza" e "Funcionário"

### Requirement: Logout
O botão "Sair" do cabeçalho SHALL apagar o cookie de sessão, descartar todos os dados da API em cache no navegador e levar o usuário a `/login`. Depois do logout, voltar no histórico do navegador SHALL NOT mostrar dados da sessão encerrada.

#### Scenario: Sair
- **WHEN** a usuária `ana.souza@educare.org`, logada, clica em "Sair"
- **THEN** ela é levada a `/login`, e o cookie `educare_session` não existe mais

#### Scenario: Voltar após sair
- **WHEN** a usuária sai e usa o botão "voltar" do navegador para `/`
- **THEN** ela é levada a `/login?redirect=%2F`, sem ver o nome dela nem outros dados

### Requirement: Trocar a própria senha
A página `/minha-conta/senha` SHALL ter os campos "Senha atual", "Nova senha" e "Confirme a nova senha". Antes de enviar, o formulário SHALL exigir os três campos, "Nova senha" com 8 a 72 caracteres e no máximo 72 bytes em UTF-8, e a confirmação igual à nova senha, mostrando o erro junto ao campo, sem chamar a API. No envio, o servidor do frontend SHALL chamar `PUT /api/v1/auth/me/password`. Com `204`, SHALL mostrar "Senha alterada." e limpar os campos, mantendo a sessão. Com `400`, SHALL mostrar os erros de `errors` junto aos campos correspondentes (`currentPassword` em "Senha atual", `newPassword` em "Nova senha").

#### Scenario: Senha trocada
- **WHEN** a usuária `ana.souza@educare.org`, com senha `segredo123`, preenche "Senha atual" com `segredo123` e "Nova senha" e a confirmação com `novaSenha456`, e envia
- **THEN** a página mostra "Senha alterada.", os campos ficam vazios, e ela continua logada

#### Scenario: Senha atual incorreta
- **WHEN** a usuária preenche "Senha atual" com `errada123` e a nova senha válida e confirmada, e a API responde `400` com uma entrada em `errors` para `currentPassword`
- **THEN** a mensagem da API aparece junto a "Senha atual", e a página não mostra "Senha alterada."

#### Scenario: Confirmação diferente
- **WHEN** a usuária preenche "Nova senha" com `novaSenha456` e a confirmação com `novaSenha789`, e envia
- **THEN** aparece um erro junto a "Confirme a nova senha", e nenhuma requisição é feita à API

#### Scenario: Nova senha curta
- **WHEN** a usuária preenche "Nova senha" e a confirmação com `curta`, e envia
- **THEN** aparece um erro junto a "Nova senha", e nenhuma requisição é feita à API
