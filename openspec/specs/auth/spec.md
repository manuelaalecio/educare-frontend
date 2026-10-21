# auth Specification

## Purpose

Dar aos funcionários a tela de entrada do sistema, com a validação dos campos no navegador, antes da integração com a API do Educare.

## Requirements

### Requirement: Página de login
A página `/login` SHALL ter o título "Entrar · Educare" e um formulário com os campos "Email" e "Senha" e o botão "Entrar", sem link nem opção de cadastro. Antes de enviar, o formulário SHALL exigir os dois campos preenchidos (ignorando espaços nas pontas do email), email com no máximo 254 caracteres e senha com no máximo 72 bytes em UTF-8, mostrando o erro junto ao campo, sem executar a ação de envio. Com os campos válidos, o formulário SHALL executar a ação de envio com o email e a senha, e enquanto ela não terminar o botão "Entrar" SHALL ficar desabilitado. Nesta etapa, a ação de envio SHALL NOT fazer requisições à API e SHALL mostrar "A entrada no sistema ainda não está disponível."

#### Scenario: Página exibida
- **WHEN** a usuária abre `/login`
- **THEN** o título da página é "Entrar · Educare", aparecem os campos "Email" e "Senha" e o botão "Entrar", e não há link de cadastro

#### Scenario: Campos vazios
- **WHEN** a usuária clica em "Entrar" com os dois campos vazios
- **THEN** aparece um erro junto a "Email" e outro junto a "Senha", e a ação de envio não é executada

#### Scenario: Campos só com espaços
- **WHEN** a usuária preenche "Email" só com espaços, deixa "Senha" vazia e clica em "Entrar"
- **THEN** aparece um erro junto a "Email" e outro junto a "Senha", e a ação de envio não é executada

#### Scenario: Email longo demais
- **WHEN** a usuária preenche um email com 255 caracteres e uma senha válida e clica em "Entrar"
- **THEN** aparece um erro junto a "Email", e a ação de envio não é executada

#### Scenario: Senha acima de 72 bytes
- **WHEN** a usuária preenche uma senha com 40 caracteres `ç` (80 bytes em UTF-8) e clica em "Entrar"
- **THEN** aparece um erro junto a "Senha", e a ação de envio não é executada

#### Scenario: Envio em andamento
- **WHEN** a usuária preenche campos válidos, clica em "Entrar" e a ação de envio ainda não terminou
- **THEN** o botão "Entrar" fica desabilitado, e um segundo clique não executa a ação de novo

#### Scenario: Entrada ainda indisponível
- **WHEN** a usuária preenche `admin@educare.org` e `educare123` e clica em "Entrar"
- **THEN** a página continua em `/login` e mostra "A entrada no sistema ainda não está disponível.", e nenhuma requisição é feita à API
