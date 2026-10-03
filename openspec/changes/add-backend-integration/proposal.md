# Proposal

## Why

O frontend ainda é o template do TanStack Start e não fala com a API do Educare (`educare-backend`). Antes de qualquer tela de negócio (crianças, responsáveis, rematrícula), os funcionários precisam entrar no sistema. Além disso, toda tela vai precisar do mesmo caminho até a API: tipado a partir do contrato do backend, com tratamento uniforme de erros e com o token protegido, já que o sistema lida com dados pessoais de crianças (LGPD).

## What Changes

- **BFF no servidor do TanStack Start**: o navegador só fala com o próprio frontend. As chamadas à API saem de server functions, no servidor (Vercel), com o JWT lido de um cookie `httpOnly`. O token nunca fica acessível ao JavaScript do navegador nem ao `localStorage`.
- **Configuração**: nova variável de servidor `EDUCARE_API_URL` (obrigatória e `https` em produção), no `src/env.ts` e no `.env.example`. Ela substitui o `SERVER_URL` do template, que não é usado.
- **Tipos gerados do contrato do backend**: o script `npm run api:generate` baixa o `openapi/educare-api.json` do `educare-backend` (ou lê uma cópia local) e gera os tipos em `src/integrations/educare-api/schema.gen.ts`, que é commitado. Assim o `npm run typecheck` acusa o uso de campos que a API não tem mais.
- **Cliente da API** (`src/integrations/educare-api/`), só para uso no servidor:
  - injeta o `Authorization: Bearer`;
  - aplica um tempo limite;
  - converte as respostas de erro (`ProblemDetail`) num erro tipado, com os erros por campo;
  - sem token válido, encerra a sessão e manda para o login.
- **Autenticação e sessão**:
  - página `/login` (email e senha);
  - logout;
  - rotas protegidas por padrão, com volta à página pedida depois do login;
  - sessão expirada (o token dura 8 h, sem refresh) levando ao login com aviso;
  - dados do usuário logado (nome e role) no layout;
  - página `/minha-conta/senha` para trocar a própria senha.
- **Layout base autenticado**, com cabeçalho (nome do usuário, link para a troca de senha, botão de sair) e uma página inicial simples no lugar do template. Também acerta o `lang="pt-BR"` e o título do documento.

## Non-goals

- Telas de CRUD de usuários, crianças, responsáveis ou rematrícula (changes seguintes, uma por módulo).
- Esconder ou mostrar itens de menu por role. Por enquanto só o nome e a role aparecem no cabeçalho; a autorização continua sendo do backend.
- Refresh token, "lembrar de mim", recuperação de senha por email e bloqueio por tentativas: o backend não oferece nenhum deles.
- Chamar a API direto do navegador, CORS e o `VITE_` para a URL da API.
- Testes end-to-end com navegador (Playwright) e CI do frontend: ficam para uma change própria. Aqui os testes são Vitest + Testing Library, com a API simulada.
- Internacionalização. Os textos ficam em português no código.
- Preencher o `openspec/config.yaml` do frontend com contexto e regras (sugerido como tarefa separada).

## Capabilities

### New Capabilities
- `api-client`: como o frontend acessa a API do Educare. Cobre o acesso só pelo servidor (BFF), a configuração da URL, os tipos gerados do contrato, o tempo limite e o tratamento uniforme dos erros (`ProblemDetail`, falha de rede, `401`, `403`).
- `auth`: entrada e saída do sistema e a sessão do usuário. Cobre o login, o cookie de sessão, as rotas protegidas, a sessão expirada, os dados do usuário logado e a troca da própria senha.

### Modified Capabilities
<!-- Nenhuma: o projeto ainda não tem specs. -->

## Impact

- **Dependências de planejamento**: exige a change `add-frontend-integration` do `educare-backend` aplicada, pelo contrato em `openapi/educare-api.json` com erros e campos obrigatórios declarados e pela API com HTTPS para a produção. Para desenvolver, basta o backend rodando localmente em `http://localhost:8080`.
- **Código**:
  - `src/env.ts` e `.env.example`;
  - novo `src/integrations/educare-api/` (cliente, erros, sessão, tipos gerados);
  - rotas novas: `src/routes/login.tsx`, layout `src/routes/_authenticated.tsx`, `src/routes/_authenticated/index.tsx` (substitui `src/routes/index.tsx`) e `src/routes/_authenticated/minha-conta/senha.tsx`;
  - `src/routes/__root.tsx` (idioma, título, contexto da sessão);
  - componentes shadcn novos (`card`, `alert`, `sonner` ou similar).
- **Dependências**: `openapi-fetch` (runtime, cliente tipado de ~6 kB) e `openapi-typescript` (dev, gerador de tipos).
- **Configuração na Vercel**: variável `EDUCARE_API_URL` com a URL `https://` da API em produção e nos previews.
- **Backend**: nenhuma mudança além da change irmã. O BFF não depende do CORS.
