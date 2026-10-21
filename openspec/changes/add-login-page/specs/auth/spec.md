# Spec Delta

## Purpose

Permitir que os funcionários entrem no sistema pelo frontend com email e senha, autenticados pela API do Educare, mantendo a sessão num cookie que o JavaScript do navegador não consegue ler.

## ADDED Requirements

### Requirement: Login com email e senha
A página `/login` SHALL ter um formulário com os campos "Email" e "Senha" e o botão "Entrar", sem link nem opção de cadastro. Antes de enviar, o formulário SHALL exigir os dois campos preenchidos, email com no máximo 254 caracteres e senha com no máximo 72 bytes em UTF-8, mostrando o erro junto ao campo, sem chamar a API. No envio, o servidor do frontend SHALL chamar `POST /api/v1/auth/login` da API com o email em `login` e a senha em `password`. Com `200 OK`, SHALL gravar o `accessToken` no cookie de sessão (ver "Cookie de sessão protegido") e levar o usuário ao destino de "Volta à página pedida". Com `401`, SHALL mostrar "Email ou senha inválidos.", manter o email e limpar só o campo de senha. Com `400` da API, SHALL mostrar as mensagens de `errors` junto aos campos correspondentes (`login` em "Email", `password` em "Senha"). Enquanto o envio estiver em andamento, o botão "Entrar" SHALL ficar desabilitado.

#### Scenario: Login com sucesso
- **WHEN** existe a usuária `ana.souza@educare.org` com senha `segredo123`, e ela preenche o formulário de `/login` com esses dados e clica em "Entrar"
- **THEN** ela é levada a `/`, e o navegador tem o cookie `educare_session`

#### Scenario: Login com o administrador do banco local
- **WHEN** o backend roda localmente com o banco recém-migrado, e a usuária entra com `admin@educare.org` e a senha configurada em `EDUCARE_ADMIN_PASSWORD` (padrão `educare123`)
- **THEN** ela é levada a `/`, e o navegador tem o cookie `educare_session`

#### Scenario: Credenciais inválidas
- **WHEN** a usuária preenche `ana.souza@educare.org` e a senha `errada123` e clica em "Entrar"
- **THEN** a página continua em `/login` e mostra "Email ou senha inválidos.", o campo "Email" mantém `ana.souza@educare.org`, o campo "Senha" fica vazio, e nenhum cookie de sessão é gravado

#### Scenario: Campos vazios
- **WHEN** a usuária clica em "Entrar" com os dois campos vazios
- **THEN** aparece um erro junto a "Email" e outro junto a "Senha", e nenhuma requisição é feita à API

#### Scenario: Senha acima de 72 bytes
- **WHEN** a usuária preenche uma senha com 40 caracteres `ç` (80 bytes em UTF-8) e clica em "Entrar"
- **THEN** aparece um erro junto a "Senha", e nenhuma requisição é feita à API

#### Scenario: Erro de campo vindo da API
- **WHEN** a API responde `400` com uma entrada em `errors` para `password` com a mensagem "é obrigatória"
- **THEN** a mensagem "é obrigatória" aparece junto a "Senha", e nenhum cookie de sessão é gravado

#### Scenario: API indisponível no login
- **WHEN** a API não responde em 10 segundos, recusa a conexão ou responde `5xx`, e a usuária envia credenciais válidas
- **THEN** a página mostra "Não foi possível falar com o servidor. Tente de novo em instantes.", e nenhum cookie de sessão é gravado

#### Scenario: Envio em andamento
- **WHEN** a usuária clica em "Entrar" e a API ainda não respondeu
- **THEN** o botão "Entrar" fica desabilitado, e um segundo clique não faz outra requisição

### Requirement: Cookie de sessão protegido
O token da sessão SHALL ser guardado num único cookie `educare_session` com `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` em produção e `Max-Age` igual ao `expiresIn` devolvido pela API (28800 segundos). O cookie SHALL conter só o token, sem dados pessoais. O token SHALL NOT aparecer em nenhuma resposta enviada ao JavaScript do navegador, e o navegador SHALL NOT fazer requisições diretamente à API.

#### Scenario: Atributos do cookie em produção
- **WHEN** um usuário faz login com sucesso em produção e a API devolve `"expiresIn": 28800`
- **THEN** a resposta grava `educare_session` com `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` e `Max-Age=28800`

#### Scenario: Cookie em desenvolvimento
- **WHEN** um usuário faz login com sucesso em desenvolvimento, em `http://localhost:3000`
- **THEN** o cookie `educare_session` é gravado sem `Secure`, com os demais atributos iguais aos de produção

#### Scenario: Token fora do alcance do JavaScript
- **WHEN** um usuário faz login com sucesso
- **THEN** `document.cookie` não contém `educare_session`, a resposta da chamada de login recebida pelo navegador não contém o `accessToken`, e nenhuma requisição do navegador vai para o endereço da API

### Requirement: Volta à página pedida
Depois do login, o usuário SHALL ser levado ao caminho do parâmetro `redirect` de `/login` quando ele for um caminho interno: começa com `/`, não começa com `//` nem com `/\` e não é `/login`. Em qualquer outro caso, inclusive sem o parâmetro, SHALL ser levado a `/`.

#### Scenario: Volta para a página pedida
- **WHEN** a usuária abre `/login?redirect=%2Fminha-conta%2Fsenha` e faz login com sucesso
- **THEN** ela é levada a `/minha-conta/senha`

#### Scenario: Sem destino
- **WHEN** a usuária abre `/login` sem `redirect` e faz login com sucesso
- **THEN** ela é levada a `/`

#### Scenario: Redirect externo ignorado
- **WHEN** a usuária abre `/login?redirect=https%3A%2F%2Fmalicioso.example` ou `/login?redirect=%2F%2Fmalicioso.example` e faz login com sucesso
- **THEN** ela é levada a `/`

### Requirement: Usuário com sessão no login
Ao abrir `/login`, o servidor do frontend SHALL verificar o cookie de sessão. Sem cookie, SHALL mostrar o formulário sem chamar a API. Com cookie, SHALL consultar `GET /api/v1/auth/me` da API: com `200 OK`, SHALL levar o usuário ao destino de "Volta à página pedida"; com `401`, SHALL apagar o cookie e mostrar o formulário. Essa verificação SHALL acontecer também na renderização no servidor, antes de o formulário aparecer.

#### Scenario: Usuário logado abre o login
- **WHEN** um usuário com sessão válida abre `/login`
- **THEN** ele é levado a `/`, sem ver o formulário

#### Scenario: Sessão recusada pela API
- **WHEN** um usuário com o cookie `educare_session` de um token expirado, adulterado ou de usuário excluído abre `/login`
- **THEN** o formulário de login aparece, e o cookie `educare_session` é apagado

#### Scenario: API indisponível ao abrir o login com cookie
- **WHEN** um usuário com o cookie `educare_session` abre `/login` e a API não responde
- **THEN** o formulário de login aparece, e o cookie é mantido
