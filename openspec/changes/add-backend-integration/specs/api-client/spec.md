# Spec Delta

## Purpose

Definir como o frontend acessa a API do Educare: só pelo servidor do próprio frontend (BFF), com tipos gerados do contrato do backend, tempo limite e tratamento uniforme dos erros, sem expor o token nem detalhes internos ao navegador.

## ADDED Requirements

### Requirement: API acessada só pelo servidor do frontend
O navegador SHALL NOT fazer requisições à API do Educare. Toda chamada à API SHALL partir do servidor do frontend, que envia o token da sessão no header `Authorization: Bearer <token>`. A URL da API SHALL vir da variável de servidor `EDUCARE_API_URL` e SHALL NOT aparecer no código enviado ao navegador nem no HTML. O token SHALL NOT aparecer em respostas enviadas ao navegador, no HTML nem em qualquer armazenamento acessível ao JavaScript (`localStorage`, `sessionStorage`, cookies sem `HttpOnly`).

#### Scenario: Navegação autenticada sem chamadas diretas à API
- **WHEN** um usuário logado abre a página inicial com `EDUCARE_API_URL=https://api.educare.example`
- **THEN** nenhuma requisição do navegador vai para `api.educare.example`, o HTML e os bundles JavaScript não contêm `api.educare.example`, e a API recebe a chamada a `GET /api/v1/auth/me` vinda do servidor do frontend com `Authorization: Bearer <token da sessão>`

#### Scenario: Token fora do alcance do JavaScript
- **WHEN** um usuário faz login com sucesso
- **THEN** `document.cookie`, `localStorage` e `sessionStorage` não contêm o token, e nenhuma resposta das server functions contém o token

### Requirement: URL da API validada na inicialização
O servidor do frontend SHALL exigir `EDUCARE_API_URL` como URL absoluta. Em produção (`NODE_ENV=production`), SHALL exigir o esquema `https` e SHALL NOT iniciar com a variável ausente, vazia, inválida ou `http`. Em desenvolvimento, SHALL aceitar `http`.

#### Scenario: Produção com URL https
- **WHEN** o servidor inicia em produção com `EDUCARE_API_URL=https://api.educare.example`
- **THEN** ele inicia normalmente

#### Scenario: Produção com URL http
- **WHEN** o servidor inicia em produção com `EDUCARE_API_URL=http://129.153.10.20`
- **THEN** a validação do ambiente falha com uma mensagem que cita `EDUCARE_API_URL`, e o servidor não atende requisições

#### Scenario: Variável ausente
- **WHEN** o servidor inicia sem `EDUCARE_API_URL`
- **THEN** a validação do ambiente falha com uma mensagem que cita `EDUCARE_API_URL`

#### Scenario: Desenvolvimento com http local
- **WHEN** o servidor inicia em desenvolvimento com `EDUCARE_API_URL=http://localhost:8080`
- **THEN** ele inicia normalmente

### Requirement: Tipos da API gerados do contrato do backend
Os tipos de requisição e resposta da API SHALL ser gerados do contrato OpenAPI publicado pelo backend, por `npm run api:generate`, e commitados no repositório. O script SHALL baixar o contrato da `main` do `educare-backend` por padrão e SHALL aceitar um caminho local alternativo pela variável `API_CONTRACT`. Toda chamada à API SHALL usar esses tipos. Se o download falhar, o script SHALL terminar com erro e SHALL NOT alterar o arquivo de tipos existente.

#### Scenario: Tipos regenerados
- **WHEN** o contrato do backend ganha um campo obrigatório novo numa resposta e roda-se `npm run api:generate`
- **THEN** o arquivo de tipos gerados passa a ter o campo como obrigatório, e `npm run typecheck` passa

#### Scenario: Campo removido do contrato
- **WHEN** o contrato regenerado não tem mais um campo que o código do frontend lê
- **THEN** `npm run typecheck` falha apontando o uso do campo

#### Scenario: Contrato local
- **WHEN** roda-se `API_CONTRACT=../educare-backend/openapi/educare-api.json npm run api:generate`
- **THEN** os tipos são gerados a partir do arquivo local, sem acesso à rede

#### Scenario: Falha no download
- **WHEN** roda-se `npm run api:generate` sem acesso à rede
- **THEN** o script termina com código diferente de zero, e o arquivo de tipos gerados não é alterado

### Requirement: Erros da API tratados de forma uniforme
O cliente da API SHALL converter toda resposta de erro da API num erro tipado com o status HTTP, o `title`, o `detail` e, quando houver, a lista `errors` (`field`, `message`). Formulários SHALL mostrar cada entrada de `errors` junto ao campo correspondente e o `detail` como mensagem geral. Para `403`, a interface SHALL mostrar "Você não tem permissão para fazer isso.". Para `5xx`, resposta que não seja `ProblemDetail`, falha de rede ou ausência de resposta da API em até 10 segundos, a interface SHALL mostrar "Não foi possível falar com o servidor. Tente de novo em instantes." e SHALL NOT mostrar mensagens internas, URLs ou stack traces. Os logs do servidor do frontend SHALL NOT conter corpo de requisição, senha, token nem dados pessoais.

#### Scenario: Erros de campo exibidos no formulário
- **WHEN** a API responde `400` com `{"detail": "Um ou mais campos são inválidos", "errors": [{"field": "newPassword", "message": "deve ter entre 8 e 72 caracteres"}]}` ao envio de um formulário
- **THEN** a mensagem "deve ter entre 8 e 72 caracteres" aparece junto ao campo `newPassword`

#### Scenario: Sem permissão
- **WHEN** a API responde `403` a uma ação
- **THEN** a interface mostra "Você não tem permissão para fazer isso." e a sessão continua ativa

#### Scenario: Erro interno da API
- **WHEN** a API responde `500` com um corpo qualquer
- **THEN** a interface mostra "Não foi possível falar com o servidor. Tente de novo em instantes." e não mostra o corpo da resposta

#### Scenario: API sem resposta
- **WHEN** a API não responde em 10 segundos
- **THEN** a chamada é abortada e a interface mostra "Não foi possível falar com o servidor. Tente de novo em instantes."

#### Scenario: Log sem dados sensíveis
- **WHEN** uma chamada de login falha por erro de rede
- **THEN** o log do servidor registra o método, a rota e o motivo, e não contém o email, a senha nem o token

### Requirement: Token recusado encerra a sessão
Quando a API responder `401` a uma chamada feita com o token da sessão, o servidor do frontend SHALL apagar o cookie de sessão, e a interface SHALL levar o usuário a `/login?redirect=<caminho atual>&motivo=sessao-expirada`. O `401` do próprio login (credenciais inválidas) SHALL NOT disparar esse fluxo.

#### Scenario: Token expirado durante o uso
- **WHEN** um usuário logado navega para uma página e a API responde `401` à chamada que a página faz
- **THEN** o cookie de sessão é apagado e o usuário é levado a `/login?redirect=<caminho da página>&motivo=sessao-expirada`

#### Scenario: Usuário excluído enquanto logado
- **WHEN** um `ADMIN` exclui a usuária `ana.souza@educare.org` enquanto ela está logada, e ela navega para outra página
- **THEN** ela é levada à página de login, e o cookie de sessão foi apagado
