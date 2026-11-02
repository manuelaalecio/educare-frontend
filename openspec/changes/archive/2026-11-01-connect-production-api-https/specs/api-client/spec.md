# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
