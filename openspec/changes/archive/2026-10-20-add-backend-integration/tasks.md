# Tasks

## 1. Ambiente e dependências

- [x] 1.1 Instalar `openapi-fetch` (dependência) e `openapi-typescript` (dev) com `npm install`, e verificar que `npm run typecheck` continua passando
- [x] 1.2 Atualizar `src/env.ts` (D7): remover `SERVER_URL`, adicionar `EDUCARE_API_URL` com `https` obrigatório em produção, e `runtimeEnv` lendo `process.env` no servidor. Atualizar o `.env.example`. Testes unitários dos cenários "Produção com URL https", "Produção com URL http", "Variável ausente" e "Desenvolvimento com http local"

## 2. Contrato e tipos gerados

- [x] 2.1 Criar `scripts/generate-api-types.mjs` e o script `api:generate` (D8). Excluir `src/integrations/educare-api/schema.gen.ts` do Biome. Testes do script: contrato local gera o arquivo ("Contrato local"); contrato inválido ou download com erro sai com código 1 e não altera o arquivo existente ("Falha no download")
- [x] 2.2 Rodar `API_CONTRACT=../educare-backend/openapi/educare-api.json npm run api:generate` e commitar o `schema.gen.ts`. Verificar que `POST /api/v1/auth/login` tem `200` com `accessToken`, `tokenType` e `expiresIn` obrigatórios, que `/api/v1/auth/me` tem `id`, `name`, `login`, `role`, `createdAt` e `updatedAt` obrigatórios, que o `ProblemDetail` tem só `title` e `status` obrigatórios e que `npm run typecheck` passa

## 3. Cliente da API e erros

- [x] 3.1 Criar `src/integrations/educare-api/client.ts` (D2): `createApiClient(token?)` com `baseUrl` do `env`, Bearer, timeout de 10 s e log sem corpo nem headers, protegido contra import no navegador. Testes unitários com `fetch` simulado: header `Authorization` presente só com token, abort aos 10 s, e log sem email, senha nem token ("Log sem dados sensíveis")
- [x] 3.2 Criar `errors.ts` e `messages.ts` (D3): conversão de respostas em `ApiError` (`validation` com `fieldErrors`, `unauthorized`, `forbidden`, `not-found`, `conflict`, `unavailable`). Testes unitários: `400` com `errors`, `403`, `500` com corpo HTML, falha de rede e timeout, `ProblemDetail` sem `type` nem `detail` ("Erro sem detail") e JSON sem `title`/`status` → `unavailable`, cobrindo a parte de conversão dos cenários "Erros de campo exibidos no formulário", "Sem permissão", "Erro interno da API" e "API sem resposta"
- [x] 3.3 Criar o middleware de função autenticada (D3): injeta `context.token`, e no `401` da API ou sem cookie apaga o cookie e lança `redirect` para `/login` com `redirect` e `motivo=sessao-expirada`. Testes da lógica pura cobrindo "Token expirado durante o uso" e "Usuário excluído enquanto logado" (API responde `401` → cookie apagado + redirect)

## 4. Sessão e login

- [x] 4.1 Criar `safeRedirect` (D5) com testes unitários dos cenários "Volta para a página pedida" e "Redirect externo ignorado" (`https://...`, `//...`, `/\...`, `/login`, ausente, não-string)
- [x] 4.2 Acrescentar ao `validation.ts` (já criado pela `add-login-page` com o `loginSchema`) os validadores da troca de senha (D9), com testes unitários: nova senha curta e confirmação diferente
- [x] 4.3 Criar as server functions `login`, `logout` e `getCurrentUser` com a lógica em funções puras (D1, D10). O `login` grava `educare_session` com os atributos da spec e `Max-Age` do `expiresIn`; o `401` do login vira `{ ok: false, kind: "invalid-credentials" }`, sem redirect. Testes: atributos do cookie em produção e em desenvolvimento ("Atributos do cookie em produção", "Cookie em desenvolvimento"), `401` sem cookie gravado, `400` convertido em `fieldErrors` sem cookie gravado ("Erro de campo vindo da API"), `getCurrentUser` devolvendo `null` sem chamar a API quando não há cookie, e nenhuma resposta das server functions contendo o token ("Token fora do alcance do JavaScript")
- [x] 4.4 Adicionar o `sonner` (`npx shadcn@latest add sonner`) e, na rota `src/routes/login.tsx` já criada pela `add-login-page`, acrescentar `validateSearch`, `beforeLoad` (sessão → `/`) e o aviso de sessão expirada, e trocar a ação provisória do `LoginForm` pela server function `login` (D9: erros por campo, senha limpa no `401`, `router.invalidate()` + `navigate` para `safeRedirect`). Remover a mensagem "A entrada no sistema ainda não está disponível." e o teste dela. Testes com Testing Library dos cenários "Login com sucesso" (navega para o destino), "Credenciais inválidas", "API indisponível no login", "Envio em andamento" (uma só requisição), "Aviso de sessão expirada" e "Login normal sem aviso"

## 5. Área autenticada

- [x] 5.1 Criar `src/routes/_authenticated.tsx` (D4) com `beforeLoad` usando `currentUserQuery` e `Cache-Control: no-store` (D6). Mover a página inicial para `src/routes/_authenticated/index.tsx` com conteúdo simples ("Bem-vindo(a), <nome>"). Ajustar `__root.tsx` (`lang="pt-BR"`, título "Educare"). Testes dos cenários "Acesso sem sessão" e "Usuário logado abre o login" pela lógica do `beforeLoad`, e verificação manual com `npm run dev` de que `/minha-conta/senha` sem cookie responde redirect no SSR, sem o formulário no HTML (`curl -i http://localhost:3000/minha-conta/senha`)
- [x] 5.2 Criar o cabeçalho com nome, role traduzida ("Administrador"/"Funcionário"), link "Minha senha" e botão "Sair" (D6: `logout` + `queryClient.clear()` + `invalidate` + `navigate`). Testes com Testing Library de "Cabeçalho de um ADMIN", "Cabeçalho de um USER", role desconhecida exibida como veio (D11) e "Sair" (server function chamada, cache limpo, navegação para `/login`)
- [x] 5.3 Criar `src/routes/_authenticated/minha-conta/senha.tsx` com `ChangePasswordForm` e a server function `changeOwnPassword`. Testes com Testing Library de "Senha trocada", "Senha atual incorreta", "Confirmação diferente", "Nova senha curta" e de "Sem permissão" (`403` → mensagem, sessão mantida)

## 6. Documentação

- [x] 6.1 README: seção "Integração com a API" (BFF, `EDUCARE_API_URL`, `npm run api:generate` e `API_CONTRACT`, como rodar com o backend local, configuração na Vercel e o cuidado com previews). CLAUDE.md: regras "o navegador nunca chama a API; use server functions com o cliente de `#/integrations/educare-api`", "rotas protegidas ficam sob `src/routes/_authenticated/`", "não edite `schema.gen.ts`; regenere com `npm run api:generate`". Conferir que README e CLAUDE.md não se contradizem

## 7. Verificação integrada

- [x] 7.1 Criar `scripts/check-bundle.mjs` (D10) e rodar `EDUCARE_API_URL=https://api.educare.example npm run build && node scripts/check-bundle.mjs`. Verificar que `.output/public` não contém `api.educare.example` nem `educare_session` ("Navegação autenticada sem chamadas diretas à API", parte estática)
- [x] 7.2 Com o backend local (`./gradlew bootRun` no `educare-backend`) e `npm run dev`, fazer manualmente: login como `admin@educare.org`, navegar, trocar a senha, sair e voltar no histórico. No DevTools, confirmar que nenhuma requisição vai para `localhost:8080`, que `document.cookie` não mostra `educare_session` e que o cookie aparece com `HttpOnly` na aba Application. Com o backend parado, confirmar a mensagem de servidor indisponível. Ainda com o backend no ar, gerar um token expirado (relógio do backend ou cookie adulterado) e confirmar a ida a `/login` com o aviso de sessão expirada. Senha do admin local: `educare123` com `bootRun` sem `EDUCARE_ADMIN_PASSWORD`; com o banco criado pelo `docker compose`, é a do `.env` no momento da criação (para voltar ao padrão, `docker compose down -v`, que apaga os dados locais)
- [x] 7.3 Rodar `npm run check -- --write`, `npm run typecheck` e `npm test` e verificar que os três terminam sem erro
