# Tasks

## 1. Testes da regra "só https"

- [x] 1.1 Em `src/env.test.ts`, trocar o caso "Produção com URL http" para usar `http://136.248.80.75` e conferir que o erro contém "EDUCARE_API_URL" e "deve usar https em produção" (CA06), e acrescentar o caso "Produção com a URL da API na Oracle" (`https://136-248-80-75.sslip.io` inicia normalmente), sem mexer em `src/env.ts` (D1; cenários "Produção com URL http" e "Produção com a URL da API na Oracle" da spec `api-client`). Verificar com `npx vitest run src/env.test.ts`

## 2. Testes da falha de TLS

- [x] 2.1 Em `src/integrations/educare-api/client.test.ts`, acrescentar o caso em que o `fetch` rejeita com `new TypeError('fetch failed', { cause: Object.assign(new Error('self-signed certificate'), { code: 'DEPTH_ZERO_SELF_SIGNED_CERT' }) })` numa chamada de login com `ana.souza@educare.org` e `segredo123`. O log deve ter `falhou (TypeError)` e não deve conter o email, a senha, o token, "self-signed" nem `DEPTH_ZERO_SELF_SIGNED_CERT` (D1, D2; requisito "Certificado TLS da API verificado"). Verificar com `npx vitest run src/integrations/educare-api/client.test.ts`
- [x] 2.2 Em `src/integrations/educare-api/auth.test.ts`, acrescentar o caso de `performLogin` com o mesmo erro de TLS: devolve `kind: 'unavailable'` com `messages.unavailable` e não grava cookie (D1; cenário "API com o certificado padrão do Traefik"). Verificar com `npx vitest run src/integrations/educare-api/auth.test.ts`
- [x] 2.3 Conferir que nada no código desliga a verificação de certificado (D2). Verificar com `grep -rn "rejectUnauthorized\|NODE_TLS_REJECT_UNAUTHORIZED\|NODE_EXTRA_CA_CERTS\|setGlobalDispatcher" src scripts vite.config.ts vercel.json .env.example` sem resultados
- [x] 2.4 Conferência manual local com certificado ruim: `EDUCARE_API_URL=https://self-signed.badssl.com npm run dev`, login em `http://localhost:3000/login` com `ana.souza@educare.org` / `segredo123` (fictícios). Esperado: a tela mostra "Não foi possível falar com o servidor. Tente de novo em instantes.", e o terminal mostra `[educare-api] POST /api/v1/auth/login falhou (TypeError)`, sem email nem senha (D2; seção Testes do design)

## 3. Documentação

- [x] 3.1 Na seção "Vercel" do `README.md`: o valor `EDUCARE_API_URL=https://136-248-80-75.sslip.io` em Production e Preview (D3); as conferências de `curl` e `openssl` do D4 antes de trocar a variável; que mudar a variável exige redeploy (D5); que uma falha de certificado aparece como "Não foi possível falar com o servidor" com `falhou (TypeError)` no log; a proibição de `NODE_TLS_REJECT_UNAUTHORIZED=0`; que a URL acompanha o host do Ingress se o IP mudar; e, no aviso dos previews, que até existir backup do Postgres produção e previews só recebem dados fictícios (D7). Verificar relendo a seção e rodando o comando `curl` do README como está escrito (depois que o back estiver pronto, pode ser na tarefa 4.1)

## 4. Produção (depende das subtarefas de back-end)

- [x] 4.1 Conferir o certificado de produção da API (D4): `curl -sS https://136-248-80-75.sslip.io/actuator/health` (sem `-k`) responde 200, e `openssl s_client -connect 136-248-80-75.sslip.io:443 -servername 136-248-80-75.sslip.io </dev/null | openssl x509 -noout -issuer -dates` mostra `O=Let's Encrypt`, sem "(STAGING)" nem "TRAEFIK". Se ainda for staging, parar aqui e esperar o back
- [x] 4.2 Com a confirmação da Manuela, configurar `EDUCARE_API_URL=https://136-248-80-75.sslip.io` nos ambientes Production e Preview da Vercel (painel ou `vercel env add`) e fazer o redeploy do último deploy de produção (D3, D5). Verificar com `vercel env ls` (ou no painel) e nos logs da função, sem "Variáveis de ambiente inválidas"
- [x] 4.3 Teste de ponta a ponta (D6; cenário "Login de ponta a ponta com certificado válido", CA05): login em `https://educare-frontend-ruby.vercel.app` com um usuário fictício `COORDENADOR`, chegada em `/` com o nome no cabeçalho, e abertura de Configurações › Turmas. Verificar nos logs da Vercel `[educare-api] POST /api/v1/auth/login 200` e `GET /api/v1/classrooms 200`, sem `fetch failed`, e nos logs da API as chamadas sem erro de TLS. Registrar o resultado na subtarefa [[Infra][Front] EDUCARE_API_URL em HTTPS na Vercel e login de ponta a ponta](https://app.clickup.com/t/1dfh60ph131)

## 5. Fechamento

- [x] 5.1 Rodar `npm run check -- --write`, `npm run typecheck` e `npm test`. Verificar que os três terminam sem erros e que o `git diff` só mostra os testes, o `README.md` e os arquivos desta change
