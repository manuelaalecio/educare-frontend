# Proposal

## Why

O front de produção na Vercel ainda não fala com a API. Hoje a API responde só em `http://136.248.80.75/`, e o `src/env.ts` recusa, em produção, uma `EDUCARE_API_URL` sem `https://`. Isso está certo: a senha do login e o JWT de toda requisição não podem trafegar em texto claro, ainda mais com dados de crianças (LGPD, art. 14). A tarefa [[Infra][Back+Front] HTTPS na API com cert-manager e conexão do front em produção](https://app.clickup.com/t/1dfh60ph12y) põe a API em `https://136-248-80-75.sslip.io` com um certificado da Let's Encrypt. Esta change cuida da parte do front: apontar a Vercel para esse endereço, provar que o login funciona de ponta a ponta e garantir que a regra de "só https em produção" continue valendo.

## What Changes

- Configurar `EDUCARE_API_URL=https://136-248-80-75.sslip.io` na Vercel (Production e Preview), fazer o redeploy e testar o login de ponta a ponta em `https://educare-frontend-ruby.vercel.app` com um usuário fictício.
- Deixar explícito na spec `api-client` que o servidor do front verifica o certificado TLS da API: um certificado inválido (como o TRAEFIK DEFAULT CERT, autoassinado) é tratado como falha de conexão, sem enviar credenciais nem token.
- Fixar na spec e nos testes a mensagem "deve usar https em produção" quando a URL de produção começa com `http://` (CA06 da tarefa, comportamento que já existe e deve ser mantido).
- Atualizar a seção "Vercel" do `README.md`: a URL real da API, o aviso de que os previews falam com a API de produção, a regra de usar só dados fictícios até existir backup do Postgres, e o que fazer se o login falhar por TLS.
- Não há mudança no código de produção: o nome da variável, a validação de https e o cliente da API já existem.

## Non-goals

- Tudo o que é infra no `educare-backend`: cert-manager, ClusterIssuers, Ingress, Middleware de redirect, portas abertas e rollback do HTTPS (subtarefas de back-end da mesma tarefa).
- Domínio próprio para a API ou para o front. Quando houver, basta trocar a `EDUCARE_API_URL`.
- HSTS, WAF e rate limit.
- Aceitar certificado inválido em qualquer ambiente (por exemplo, `NODE_TLS_REJECT_UNAUTHORIZED=0`) para "destravar" um deploy.
- Mudança de CORS: o navegador não chama a API, e o CORS do backend já lista o domínio da Vercel.
- Carga de dados reais de crianças: só depois do backup automático do Postgres (RN01 da tarefa).

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `api-client`: o requisito "URL da API validada na inicialização" passa a citar a mensagem "deve usar https em produção" e a exigir a verificação do certificado TLS da API. Um certificado inválido é tratado como API indisponível.

## Impact

- **Código:** só `src/env.test.ts` (o teste passa a conferir a mensagem) e um teste novo do cliente para o erro de TLS. `src/env.ts` e `src/integrations/educare-api/client.ts` não mudam.
- **Docs:** `README.md` (seção "Vercel").
- **Operação:** variável `EDUCARE_API_URL` nos ambientes Production e Preview da Vercel e um redeploy. É uma ação externa, feita pela Manuela (ou com a confirmação dela).
- **Ordem e dependências:** o passo na Vercel e o teste de ponta a ponta só podem ser feitos depois que as subtarefas de back-end estiverem prontas, com `https://136-248-80-75.sslip.io/actuator/health` respondendo 200 com o certificado de produção da Let's Encrypt (CA01) e não o de staging. Os testes e o README podem ser feitos antes.
- **Sobreposição:** não há outras changes em andamento no `openspec/changes/` do front. No `educare-backend`, a change de HTTPS da mesma tarefa mexe no Ingress e nos docs de lá, sem tocar em arquivos deste repositório.
