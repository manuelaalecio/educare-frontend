# Proposal

## Why

Os funcionários vão precisar de uma tela para entrar no sistema, e hoje o frontend é só o template do TanStack Start. Esta change entrega apenas a página `/login` (layout e validação dos campos no navegador), para ver e ajustar a tela antes de ligá-la à API.

A integração de verdade (tipos gerados, cliente da API, server functions, cookie de sessão, volta à página pedida) fica na change `add-backend-integration`, que liga esta página à API depois.

## What Changes

- **Página `/login`** com o título "Entrar · Educare": um `Card` centralizado com o nome "Educare", os campos "Email" e "Senha" e o botão "Entrar", sem link de cadastro.
- **Validação no navegador** espelhando as regras do backend: os dois campos obrigatórios, email com até 254 caracteres e senha com até 72 bytes em UTF-8, com o erro junto ao campo.
- **Ação de envio recebida por prop**: o formulário chama a ação que a página passa e desabilita o botão "Entrar" até ela terminar. Nesta etapa, a ação é provisória, não chama a API e mostra "A entrada no sistema ainda não está disponível."
- **Componentes shadcn** `card` e `alert`.
- A página `/` continua a mesma.

## Non-goals

- Qualquer comunicação com a API: tipos gerados, cliente, conversão de erros, server functions, cookie de sessão, verificação de sessão ao abrir `/login` e volta à página pedida (`redirect`). Tudo isso fica na `add-backend-integration`.
- Cadastro, criação ou edição de usuários. Não haverá link nem página de cadastro.
- Logout, rotas protegidas, cabeçalho com o usuário, troca de senha, recuperação de senha e "lembrar de mim".
- Mudanças no `educare-backend`.

## Capabilities

### New Capabilities
- `auth`: entrada no sistema pelo frontend. Nesta change, cobre a página `/login` e a validação dos campos no navegador.

### Modified Capabilities
<!-- Nenhuma: o projeto ainda não tem specs em openspec/specs/. -->

## Impact

- **Código**:
  - nova rota `src/routes/login.tsx`;
  - novo componente `src/components/auth/login-form.tsx`;
  - novo `src/integrations/educare-api/validation.ts` com o `loginSchema` (no lugar que a `add-backend-integration` já prevê);
  - componentes shadcn novos (`card`, `alert`).
- **Dependências**: nenhuma nova (`zod` e `@tanstack/react-form` já estão instalados).
- **Para rodar**: só `npm run dev`; o backend não é necessário.
- **Outra change**: a `add-backend-integration` foi revisada para reaproveitar o `LoginForm`, o `loginSchema` e os componentes desta change, trocar a ação provisória pela server function `login` e alterar o requisito "Página de login" (por isso esta change precisa ser arquivada antes dela).
