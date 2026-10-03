# Tasks

## 1. Ambiente e dependências

- [ ] 1.1 Instalar `openapi-fetch` (dependência) e `openapi-typescript` (dev) com `npm install`, e verificar que `npm run typecheck` continua passando
- [ ] 1.2 Atualizar `src/env.ts` (D7): remover `SERVER_URL`, adicionar `EDUCARE_API_URL` com `https` obrigatório em produção, e `runtimeEnv` lendo `process.env` no servidor. Atualizar o `.env.example`. Testes unitários dos cenários "Produção com URL https", "Produção com URL http", "Variável ausente" e "Desenvolvimento com http local"

## 2. Contrato e tipos gerados

- [ ] 2.1 Criar `scripts/generate-api-types.mjs` e o script `api:generate` (D8). Excluir `src/integrations/educare-api/schema.gen.ts` do Biome. Testes do script: contrato local gera o arquivo ("Contrato local"); contrato inválido ou download com erro sai com código 1 e não altera o arquivo existente ("Falha no download")
- [ ] 2.2 Rodar `API_CONTRACT=../educare-backend/openapi/educare-api.json npm run api:generate` com o contrato da `add-frontend-integration` e commitar o `schema.gen.ts`. Verificar que os tipos de `/api/v1/auth/me` têm `id`, `name`, `login`, `role`, `createdAt` e `updatedAt` obrigatórios e que `npm run typecheck` passa

## 3. Cliente da API e erros

- [ ] 3.1 Criar `src/integrations/educare-api/client.ts` (D2): `createApiClient(token?)` com `baseUrl` do `env`, Bearer, timeout de 10 s e log sem corpo nem headers, protegido contra import no navegador. Testes unitários com `fetch` simulado: header `Authorization` presente só com token, abort aos 10 s, e log sem email, senha nem token ("Log sem dados sensíveis")
- [ ] 3.2 Criar `errors.ts` e `messages.ts` (D3): conversão de respostas em `ApiError` (`validation` com `fieldErrors`, `unauthorized`, `forbidden`, `not-found`, `conflict`, `unavailable`). Testes unitários: `400` com `errors`, `403`, `500` com corpo HTML, falha de rede e timeout, cobrindo a parte de conversão dos cenários "Erros de campo exibidos no formulário", "Sem permissão", "Erro interno da API" e "API sem resposta"
- [ ] 3.3 Criar o middleware de função autenticada (D3): injeta `context.token`, e no `401` da API ou sem cookie apaga o cookie e lança `redirect` para `/login` com `redirect` e `motivo=sessao-expirada`. Testes da lógica pura cobrindo "Token expirado durante o uso" e "Usuário excluído enquanto logado" (API responde `401` → cookie apagado + redirect)

## 4. Sessão e login

- [ ] 4.1 Criar `safeRedirect` (D5) com testes unitários dos cenários "Volta para a página pedida" e "Redirect externo ignorado" (`https://...`, `//...`, `/\...`, `/login`, ausente, não-string)
- [ ] 4.2 Criar os validadores de formulário (D9) com testes unitários: campos vazios, email com mais de 254 caracteres, senha com 40 `ç` (80 bytes), nova senha curta e confirmação diferente
- [ ] 4.3 Criar as server functions `login`, `logout` e `getCurrentUser` com a lógica em funções puras (D1, D10). O `login` grava `educare_session` com os atributos da spec e `Max-Age` do `expiresIn`; o `401` do login vira `{ ok: false, kind: "invalid-credentials" }`, sem redirect. Testes: atributos do cookie em produção e em desenvolvimento ("Atributos do cookie em produção", "Cookie em desenvolvimento"), `401` sem cookie gravado, `getCurrentUser` devolvendo `null` sem chamar a API quando não há cookie, e nenhuma resposta das server functions contendo o token ("Token fora do alcance do JavaScript")
- [ ] 4.4 Adicionar os componentes shadcn necessários (`npx shadcn@latest add card alert sonner`) e criar a rota `src/routes/login.tsx` com `validateSearch`, `beforeLoad` (sessão → `/`), aviso de sessão expirada e `LoginForm` (TanStack Form, botão desabilitado durante o envio). Testes com Testing Library dos cenários "Login com sucesso" (navega para o destino), "Credenciais inválidas", "Campos vazios", "Senha acima de 72 bytes", "API indisponível no login", "Aviso de sessão expirada" e "Login normal sem aviso"

## 5. Área autenticada

- [ ] 5.1 Criar `src/routes/_authenticated.tsx` (D4) com `beforeLoad` usando `currentUserQuery` e `Cache-Control: no-store` (D6). Mover a página inicial para `src/routes/_authenticated/index.tsx` com conteúdo simples ("Bem-vindo(a), <nome>"). Ajustar `__root.tsx` (`lang="pt-BR"`, título "Educare"). Testes dos cenários "Acesso sem sessão" e "Usuário logado abre o login" pela lógica do `beforeLoad`, e verificação manual com `npm run dev` de que `/minha-conta/senha` sem cookie responde redirect no SSR, sem o formulário no HTML (`curl -i http://localhost:3000/minha-conta/senha`)
- [ ] 5.2 Criar o cabeçalho com nome, role traduzida ("Administrador"/"Funcionário"), link "Minha senha" e botão "Sair" (D6: `logout` + `queryClient.clear()` + `invalidate` + `navigate`). Testes com Testing Library de "Cabeçalho de um ADMIN", "Cabeçalho de um USER" e "Sair" (server function chamada, cache limpo, navegação para `/login`)
- [ ] 5.3 Criar `src/routes/_authenticated/minha-conta/senha.tsx` com `ChangePasswordForm` e a server function `changeOwnPassword`. Testes com Testing Library de "Senha trocada", "Senha atual incorreta", "Confirmação diferente", "Nova senha curta" e de "Sem permissão" (`403` → mensagem, sessão mantida)

## 6. Documentação

- [ ] 6.1 README: seção "Integração com a API" (BFF, `EDUCARE_API_URL`, `npm run api:generate` e `API_CONTRACT`, como rodar com o backend local, configuração na Vercel e o cuidado com previews). CLAUDE.md: regras "o navegador nunca chama a API; use server functions com o cliente de `#/integrations/educare-api`", "rotas protegidas ficam sob `src/routes/_authenticated/`", "não edite `schema.gen.ts`; regenere com `npm run api:generate`". Conferir que README e CLAUDE.md não se contradizem

## 7. Verificação integrada

- [ ] 7.1 Criar `scripts/check-bundle.mjs` (D10) e rodar `EDUCARE_API_URL=https://api.educare.example npm run build && node scripts/check-bundle.mjs`. Verificar que `.output/public` não contém `api.educare.example` nem `educare_session` ("Navegação autenticada sem chamadas diretas à API", parte estática)
- [ ] 7.2 Com o backend local (`./gradlew bootRun` no `educare-backend`) e `npm run dev`, fazer manualmente: login como `admin@educare.org`, navegar, trocar a senha, sair e voltar no histórico. No DevTools, confirmar que nenhuma requisição vai para `localhost:8080`, que `document.cookie` não mostra `educare_session` e que o cookie aparece com `HttpOnly` na aba Application. Com o backend parado, confirmar a mensagem de servidor indisponível. Ainda com o backend no ar, gerar um token expirado (relógio do backend ou cookie adulterado) e confirmar a ida a `/login` com o aviso de sessão expirada
- [ ] 7.3 Rodar `npm run check -- --write`, `npm run typecheck` e `npm test` e verificar que os três terminam sem erro
