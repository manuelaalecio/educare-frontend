# Tasks

## 1. Tipos da API

- [ ] 1.1 Com o backend local no ar (`docker compose up -d db` e `./gradlew bootRun` no `educare-backend`), baixar `http://localhost:8080/v3/api-docs` para um arquivo temporário e rodar `API_CONTRACT=<arquivo> npm run api:generate` (D2). Commitar `src/integrations/educare-api/schema.gen.ts` e verificar que `POST /api/v1/auth/login` tem `login` e `password` no request e `accessToken` e `expiresIn` obrigatórios na resposta, e que `npm run typecheck` passa. README: na seção de desenvolvimento, como gerar os tipos pelo backend local até o contrato ser commitado no backend

## 2. Cliente e erros

- [ ] 2.1 Criar `src/integrations/educare-api/client.ts` (D3) com `createApiClient(token?)`, timeout de 10 s, log sem corpo nem headers e import de `@tanstack/react-start/server-only`. Testes unitários com `fetch` simulado: `Authorization` só com token, abort após 10 s, e log sem email, senha nem token
- [ ] 2.2 Criar `errors.ts` (`ApiError`, `toApiError`) e `messages.ts` (D3). Testes unitários: `400` com `errors` → `validation` com `fieldErrors`, `401` → `unauthorized`, `500` com corpo HTML, falha de rede e timeout → `unavailable`, `418` → `unexpected`

## 3. Regras de entrada

- [ ] 3.1 Criar `safe-redirect.ts` (D6) com testes unitários dos cenários "Volta para a página pedida", "Sem destino" e "Redirect externo ignorado", mais `/\malicioso.example`, `/login`, `/login?x=1`, `undefined` e número
- [ ] 3.2 Criar `validation.ts` com `loginSchema` (D7). Testes unitários: campos vazios e só com espaços, email com 255 caracteres, senha com 72 bytes (aceita) e com 40 `ç` (80 bytes, recusada)

## 4. Sessão no servidor

- [ ] 4.1 Criar `session.ts` com `loginHandler` e `sessionStatusHandler` (D4) e as server functions `login` e `getSessionStatus` ligando os handlers ao cliente, aos cookies e ao `loginSchema`. Testes unitários dos handlers com dublês: "Atributos do cookie em produção" e "Cookie em desenvolvimento" (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=28800`, `Secure` só em produção); `401`, `400` e API indisponível sem cookie gravado; resultado do login sem o `accessToken` ("Token fora do alcance do JavaScript"); status `none` sem chamar a API, `valid`, `rejected` apagando o cookie e `unknown` mantendo o cookie

## 5. Página de login

- [ ] 5.1 Rodar `npx shadcn@latest add card alert` e ajustar os imports para `cn` do pacote `cn` se preciso. Verificar com `npm run typecheck` e `npm run check`
- [ ] 5.2 Criar `src/components/auth/login-form.tsx` (D7) com testes de Testing Library, com a server function simulada: "Login com sucesso" (navega para o destino de `safeRedirect`), "Credenciais inválidas" (mensagem, email mantido, senha vazia), "Campos vazios" e "Senha acima de 72 bytes" (server function não chamada), "Erro de campo vindo da API", "API indisponível no login" e "Envio em andamento" (botão desabilitado, uma só chamada)
- [ ] 5.3 Criar `src/routes/login.tsx` (D5) com `validateSearch`, `beforeLoad` usando `getSessionStatus` e `head` com o título "Entrar · Educare". Testes da lógica do `beforeLoad` para "Usuário logado abre o login" (redirect para `safeRedirect`) e para os status `none`, `rejected` e `unknown` (sem redirect). Verificar que `npm run dev` gera a rota em `routeTree.gen.ts` sem editá-lo à mão

## 6. Verificação integrada

- [ ] 6.1 Com o backend local e `npm run dev`, fazer manualmente: entrar com `admin@educare.org` / `educare123` e ser levado a `/`; abrir `/login` de novo e ser levado a `/`; apagar o cookie, errar a senha e ver "Email ou senha inválidos."; abrir `/login?redirect=%2F%2Fmalicioso.example`, entrar e cair em `/`. No DevTools, confirmar que nenhuma requisição vai para `localhost:8080`, que `document.cookie` não mostra `educare_session` e que o cookie aparece com `HttpOnly` na aba Application. Com o backend parado, confirmar a mensagem de servidor indisponível. Adulterar o valor do cookie, subir o backend e abrir `/login`: o formulário aparece e o cookie some
- [ ] 6.2 Rodar `npm run check -- --write`, `npm run typecheck` e `npm test` e verificar que os três terminam sem erro
