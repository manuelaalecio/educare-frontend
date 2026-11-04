# api-client Specification

## Purpose

Definir como o frontend acessa a API do Educare: só pelo servidor do próprio frontend (BFF), com tipos gerados do contrato do backend, tempo limite e tratamento uniforme dos erros, sem expor o token nem detalhes internos ao navegador.

## Requirements

### Requirement: API acessada só pelo servidor do frontend
O navegador SHALL NOT fazer requisições à API do Educare. Toda chamada à API SHALL partir do servidor do frontend, que envia o token da sessão no header `Authorization: Bearer <token>`. A URL da API SHALL vir da variável de servidor `EDUCARE_API_URL` e SHALL NOT aparecer no código enviado ao navegador nem no HTML. O token SHALL NOT aparecer em respostas enviadas ao navegador, no HTML nem em qualquer armazenamento acessível ao JavaScript (`localStorage`, `sessionStorage`, cookies sem `HttpOnly`).

#### Scenario: Navegação autenticada sem chamadas diretas à API
- **WHEN** um usuário logado abre a página inicial com `EDUCARE_API_URL=https://api.educare.example`
- **THEN** nenhuma requisição do navegador vai para `api.educare.example`, o HTML e os bundles JavaScript não contêm `api.educare.example`, e a API recebe a chamada a `GET /api/v1/auth/me` vinda do servidor do frontend com `Authorization: Bearer <token da sessão>`

#### Scenario: Token fora do alcance do JavaScript
- **WHEN** um usuário faz login com sucesso
- **THEN** `document.cookie`, `localStorage` e `sessionStorage` não contêm o token, e nenhuma resposta das server functions contém o token

### Requirement: URL da API validada na inicialização
O servidor do frontend SHALL exigir `EDUCARE_API_URL` como URL absoluta. Em produção (`NODE_ENV=production`), SHALL exigir o esquema `https` e SHALL NOT iniciar com a variável ausente, vazia, inválida ou `http`. Quando a URL de produção não usar `https`, a mensagem de falha SHALL citar `EDUCARE_API_URL` e conter "deve usar https em produção". Em desenvolvimento, SHALL aceitar `http`.

#### Scenario: Produção com URL https
- **WHEN** o servidor inicia em produção com `EDUCARE_API_URL=https://api.educare.example`
- **THEN** ele inicia normalmente

#### Scenario: Produção com a URL da API na Oracle
- **WHEN** o servidor inicia em produção com `EDUCARE_API_URL=https://136-248-80-75.sslip.io`
- **THEN** ele inicia normalmente

#### Scenario: Produção com URL http
- **WHEN** o servidor inicia em produção com `EDUCARE_API_URL=http://136.248.80.75`
- **THEN** a validação do ambiente falha com uma mensagem que cita `EDUCARE_API_URL` e contém "deve usar https em produção", e o servidor não atende requisições

#### Scenario: Variável ausente
- **WHEN** o servidor inicia sem `EDUCARE_API_URL`
- **THEN** a validação do ambiente falha com uma mensagem que cita `EDUCARE_API_URL`

#### Scenario: Desenvolvimento com http local
- **WHEN** o servidor inicia em desenvolvimento com `EDUCARE_API_URL=http://localhost:8080`
- **THEN** ele inicia normalmente

### Requirement: Certificado TLS da API verificado
Nas chamadas à API por `https`, o servidor do frontend SHALL verificar o certificado apresentado pela API (cadeia confiável, validade e nome do host) e SHALL NOT oferecer configuração, variável ou exceção que desligue essa verificação. Um certificado recusado (autoassinado, de uma autoridade não confiável, vencido ou de outro host) SHALL ser tratado como falha de rede: a chamada não chega a enviar a requisição HTTP, nenhum cookie de sessão é gravado, a interface mostra "Não foi possível falar com o servidor. Tente de novo em instantes." e o log registra o método, a rota e o motivo, sem email, senha nem token.

#### Scenario: API com o certificado padrão do Traefik
- **WHEN** a API em `https://136-248-80-75.sslip.io` apresenta o certificado autoassinado "TRAEFIK DEFAULT CERT", e a usuária envia o login com `ana.souza@educare.org` e `segredo123`
- **THEN** a página continua em `/login` e mostra "Não foi possível falar com o servidor. Tente de novo em instantes.", nenhum cookie de sessão é gravado, e o log do servidor do frontend não contém o email, a senha nem o token

#### Scenario: API com certificado de staging da Let's Encrypt
- **WHEN** a API apresenta um certificado emitido pelo ambiente de staging da Let's Encrypt, que não é uma autoridade confiável
- **THEN** o login falha com "Não foi possível falar com o servidor. Tente de novo em instantes.", como no certificado autoassinado

#### Scenario: Login de ponta a ponta com certificado válido
- **WHEN** a API em `https://136-248-80-75.sslip.io` apresenta um certificado de produção da Let's Encrypt, o front de produção usa essa `EDUCARE_API_URL`, e um usuário fictício faz login em `https://educare-frontend-ruby.vercel.app`
- **THEN** ele é levado a `/`, o cabeçalho mostra o nome dele, e os logs da Vercel não têm erro de TLS

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
O cliente da API SHALL converter toda resposta de erro da API num erro tipado com o status HTTP, o `title` e, quando houver, o `detail` e a lista `errors` (`field`, `message`). Uma resposta SHALL ser tratada como `ProblemDetail` quando tiver `title` e `status`, sem depender de `type`, `detail` ou `instance`. Formulários SHALL mostrar cada entrada de `errors` junto ao campo correspondente e o `detail`, quando houver, como mensagem geral. Para `403`, a interface SHALL mostrar "Você não tem permissão para fazer isso.". Para `5xx`, resposta que não seja `ProblemDetail`, falha de rede ou ausência de resposta da API em até 10 segundos, a interface SHALL mostrar "Não foi possível falar com o servidor. Tente de novo em instantes." e SHALL NOT mostrar mensagens internas, URLs ou stack traces. Os logs do servidor do frontend SHALL NOT conter corpo de requisição, senha, token nem dados pessoais.

#### Scenario: Erros de campo exibidos no formulário
- **WHEN** a API responde `400` com `{"detail": "Um ou mais campos são inválidos", "errors": [{"field": "newPassword", "message": "deve ter entre 8 e 72 caracteres"}]}` ao envio de um formulário
- **THEN** a mensagem "deve ter entre 8 e 72 caracteres" aparece junto ao campo `newPassword`

#### Scenario: Erro sem detail
- **WHEN** a API responde `400` com `{"title": "Bad Request", "status": 400, "errors": [{"field": "login", "message": "é obrigatório"}]}`, sem `type` nem `detail`
- **THEN** a mensagem "é obrigatório" aparece junto ao campo `login`, e a interface não mostra erro de servidor indisponível

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

### Requirement: Cache curto no servidor do frontend
O servidor do frontend SHALL guardar por até 30 segundos as respostas de sucesso das leituras de turmas, usuários e crianças (listas, detalhes e histórico de turmas), em memória, e SHALL responder do que guardou, sem chamar a API, quando a mesma sessão repetir a mesma leitura nesse prazo. Respostas de erro SHALL NOT ser guardadas. `GET /api/v1/auth/me` SHALL NOT ser respondido do cache em nenhum caso.

As entradas SHALL ficar separadas por sessão: uma sessão SHALL NOT receber dados guardados a partir de outra sessão, nem de outro usuário. A separação SHALL usar o token completo da sessão, e não um dado lido de dentro dele sem a API conferir. O token e os dados guardados SHALL NOT aparecer em log. O cache SHALL guardar no máximo 500 entradas e, quando passar disso, SHALL descartar a usada há mais tempo. Nada do cache SHALL ser gravado em disco, nem enviado a outro serviço; ele SHALL sumir quando a instância do servidor reinicia.

Uma gravação bem-sucedida de turma, usuário ou criança que passa pelo servidor do frontend SHALL descartar, para todas as sessões, as entradas dos recursos que ela afeta (as mesmas que o navegador busca de novo). Uma gravação que encontra o registro já excluído (`404`) SHALL descartar também. O logout, a troca da própria senha e um `401` da API SHALL descartar as entradas da sessão envolvida. Cada resposta servida do cache SHALL gerar no log do servidor uma linha com o recurso, sem chave, filtros, id nem dados.

Quando houver mais de uma instância do servidor, cada uma SHALL ter o próprio cache; uma gravação feita por outra instância pode levar até 30 segundos para aparecer.

O botão "Atualizar" das listas também passa por esse cache: dentro dos 30 segundos, ele SHALL receber o que a sessão já tem guardado, mesmo mostrando "Atualizado agora" (dívida técnica aceita; veja o design).

#### Scenario: F5 repetido na lista
- **WHEN** a coordenadora está em `/configuracoes/usuarios` e aperta F5 10 vezes em 30 segundos, todas atendidas pela mesma instância
- **THEN** a API recebe 10 chamadas a `GET /api/v1/auth/me` e no máximo 1 a `GET /api/v1/users`

#### Scenario: Sessões separadas
- **WHEN** a coordenadora Ana abre a lista de usuários, e em seguida o coordenador Bruno, em outro navegador, abre a mesma lista
- **THEN** a API recebe a chamada da lista também com o token de Bruno, e Bruno não recebe nada guardado a partir da sessão de Ana

#### Scenario: Gravação de outra pessoa
- **WHEN** a lista de turmas está guardada para Ana, Bruno cria a "Turma 5" pela mesma instância, e Ana aperta F5 em `/configuracoes/turmas`
- **THEN** a API recebe de novo a chamada da lista para Ana, e Ana vê "Turma 5"

#### Scenario: Gravação que falha
- **WHEN** a lista de turmas está guardada, e uma tentativa de criar "Turma 1" recebe `409`
- **THEN** a lista guardada continua valendo, e a próxima leitura dentro dos 30 segundos não chama a API

#### Scenario: Prazo vencido
- **WHEN** a lista de crianças foi guardada há 31 segundos, e a mesma sessão pede a mesma lista
- **THEN** o servidor do frontend chama a API de novo

#### Scenario: Atualizar dentro dos 30 segundos
- **WHEN** a lista de turmas foi guardada há 10 segundos para Ana, uma turma é criada por outra instância do servidor (ou direto na API), e Ana clica em "Atualizar"
- **THEN** o servidor do frontend responde com a lista guardada, sem chamar a API, e a turma nova só aparece num "Atualizar" feito depois dos 30 segundos

#### Scenario: Erro não é guardado
- **WHEN** a API responde `500` à lista de turmas, e a mesma sessão clica em "Tentar de novo"
- **THEN** o servidor do frontend chama a API de novo

#### Scenario: Sessão revogada
- **WHEN** a usuária troca a própria senha num navegador, e no outro, com o token antigo, aperta F5
- **THEN** o `GET /api/v1/auth/me` é chamado, recebe `401`, e ela é levada ao login sem ver dados guardados

#### Scenario: Log sem dados
- **WHEN** a lista de crianças com o filtro `nome=joao` é servida do cache
- **THEN** o log do servidor tem uma linha com o recurso de crianças, sem "joao", sem o token e sem nenhum dado de criança

### Requirement: Limite de requisições informado
Quando a API responder `429` a uma leitura ou gravação, a interface SHALL mostrar "Muitas requisições. Aguarde um instante." no lugar onde mostraria o erro dessa ação (o alerta da lista, com "Tentar de novo", ou o alerta do modal ou formulário, que continua aberto), e a sessão SHALL continuar ativa. A troca da própria senha SHALL continuar mostrando "Muitas tentativas. Tente novamente em alguns minutos." no `429`. Um `429` SHALL NOT disparar novas tentativas automáticas.

#### Scenario: Lista com limite atingido
- **WHEN** a coordenadora abre `/configuracoes/turmas` e a API responde `429` à lista
- **THEN** a aba mostra "Muitas requisições. Aguarde um instante." e o botão "Tentar de novo", e ela continua logada

#### Scenario: Depois da janela
- **WHEN** a aba mostra "Muitas requisições. Aguarde um instante.", a janela do limite passa, e a coordenadora clica em "Tentar de novo"
- **THEN** a lista de turmas aparece

#### Scenario: Gravação com limite atingido
- **WHEN** a coordenadora clica em "Criar usuário" com campos válidos e a API responde `429`
- **THEN** o modal continua aberto com o alerta "Muitas requisições. Aguarde um instante."

#### Scenario: Troca de senha mantém a mensagem própria
- **WHEN** a usuária envia a troca de senha e a API responde `429`
- **THEN** o modal mostra "Muitas tentativas. Tente novamente em alguns minutos."
