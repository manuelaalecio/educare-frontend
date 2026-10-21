# Proposal

## Why

Os funcionários ainda não conseguem entrar no frontend: ele é o template do TanStack Start e não fala com a API do Educare. A página de login é o primeiro passo de qualquer tela de negócio, e dá para entregá-la já autenticando de verdade contra o `educare-backend` rodando localmente (Postgres no Docker + API pelo Gradle), com o usuário `admin@educare.org` que a migration `V3__seed_admin_user.sql` já cria.

A change `add-backend-integration` planeja o login junto com muito mais coisa (logout, rotas protegidas, cabeçalho, troca de senha) e está parada em 3/18 tarefas. Esta change recorta dela só a entrada no sistema, para entregar uma etapa pequena e testável.

## What Changes

- **Página `/login`** com "Email" e "Senha", validação no navegador espelhando as regras do backend (obrigatórios, email até 254 caracteres, senha até 72 bytes em UTF-8), botão "Entrar" desabilitado durante o envio e mensagens para credenciais inválidas e API indisponível.
- **Login pelo servidor do frontend (BFF)**: uma server function chama `POST /api/v1/auth/login` da API e grava o token num cookie `educare_session` `HttpOnly`. O navegador nunca vê o token nem chama a API diretamente.
- **Volta à página pedida**: depois do login, leva ao `redirect` da URL quando ele é um caminho interno; caso contrário, a `/`.
- **Quem já tem sessão válida** e abre `/login` é levado a `/`. Uma sessão recusada pela API (`401`) tem o cookie apagado e vê o formulário normalmente.
- **Base de integração mínima** em `src/integrations/educare-api/`: tipos gerados do contrato (lidos do `/v3/api-docs` do backend local, já que o `openapi/educare-api.json` do backend ainda não foi commitado), cliente tipado só de servidor com tempo limite e conversão de erros. Fica pronta para a `add-backend-integration` continuar em cima.
- A página `/` continua a mesma e **não** é protegida nesta etapa.

## Non-goals

- Cadastro, criação ou edição de usuários. Não haverá link nem página de cadastro.
- Logout, rotas protegidas, cabeçalho com o usuário, aviso de sessão expirada e troca de senha: continuam na `add-backend-integration`.
- Recuperação de senha, "lembrar de mim" e refresh token: o backend não oferece.
- Acesso direto ao banco de dados pelo frontend: o front só fala com a API, que é quem acessa o Postgres.
- Mudanças no `educare-backend`.

## Capabilities

### New Capabilities
- `auth`: entrada no sistema pelo frontend. Cobre o formulário de `/login`, a validação no navegador, o cookie de sessão protegido, a volta à página pedida e o tratamento de quem já tem sessão.

### Modified Capabilities
<!-- Nenhuma: o projeto ainda não tem specs em openspec/specs/. -->

## Impact

- **Código**:
  - novo `src/integrations/educare-api/` (tipos gerados, cliente, erros, sessão, validação, `safeRedirect`);
  - nova rota `src/routes/login.tsx` e componente de formulário;
  - componentes shadcn novos (`card`, `alert`).
- **Dependências**: nenhuma nova (`openapi-fetch`, `openapi-typescript`, `zod` e `@tanstack/react-form` já estão instalados).
- **Configuração**: usa o `EDUCARE_API_URL` que já existe no `src/env.ts` (`http://localhost:8080` no `.env.example`).
- **Para rodar**: backend local com `docker compose up -d db` e `./gradlew bootRun` no `educare-backend` (profile `dev`, que serve o `/v3/api-docs`).
- **Outra change**: a `add-backend-integration` precisa ser revisada (`/opsx:update`) para tirar os requisitos e tarefas de login cobertos aqui (as tarefas 2.2, 3.1, 3.2, 4.1, 4.2, a parte de login da 4.3 e a 4.4) e os requisitos "Login com email e senha", "Cookie de sessão protegido" e "Volta à página pedida" da spec `auth` dela, senão as duas vão adicionar os mesmos requisitos ao arquivar.
