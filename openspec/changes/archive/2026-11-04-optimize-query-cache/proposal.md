# Proposal

## Why

As listas de Configurações › Turmas e › Usuários ainda buscam os dados só no navegador e invalidam o cache "na mão" depois de cada gravação. Usuários não tem `staleTime`, então toda montagem refaz a chamada. No F5, o SSR chama `/auth/me` e o navegador busca a lista de novo: 10 F5 seguidos dão cerca de 20 chamadas ao Spring com o mesmo resultado. A VM Always Free sente isso, e o peso cresce com o cadastro de crianças. A change de crianças (`add-children-pages`) já criou o padrão: chaves por recurso, `meta.invalidates` no `MutationCache`, `loadQuery` no `loader` e o "Atualizado há…". Falta levar Turmas e Usuários para esse padrão e pôr um cache curto no servidor do front. Esta change é a parte de front-end da tarefa [[Melhoria][Back+Front] Otimizar requisições: cache de consultas e F5](https://app.clickup.com/t/1dfh60ph1zx), com as subtarefas [Cache de consultas com invalidação por chave](https://app.clickup.com/t/1dfh60ph1zz) e [Dados no SSR e cache curto no servidor do front](https://app.clickup.com/t/1dfh60ph200).

## What Changes

- **Cache no navegador (Turmas e Usuários)**: `staleTime` por tipo de dado (turmas 5 min, usuários 1 min; sessão e crianças continuam como estão). As gravações passam para `useMutation` com `meta.invalidates`, e as chamadas manuais a `invalidateQueries` saem de `classrooms-section.tsx` e `users-section.tsx`. Renomear uma turma passa a invalidar também as crianças, porque o nome da turma aparece na lista e nos detalhes delas.
- **Dados no SSR**: `/configuracoes/turmas` e `/configuracoes/usuarios` carregam a lista no `loader` (`loadQuery`). Assim, F5 e navegação chegam com os dados, sem skeleton, e o navegador não repete a chamada.
- **"Atualizado há…" nas listas de Turmas e Usuários**: o componente `UpdatedAt` sai de `components/children/` para um lugar comum e entra nas duas abas, com o botão "Atualizar" que busca de novo só aquela lista.
- **Cache curto no servidor do front (BFF)**: as server functions de leitura (turmas, usuários, crianças) guardam a resposta de sucesso por 30 s, em memória, num LRU de 500 entradas. Cada entrada fica separada pela sessão (hash do token) e marcada com a tag do recurso. Uma gravação bem-sucedida que passa pelo BFF limpa a tag para todas as sessões. O logout, a troca de senha e o `401` limpam as entradas da sessão. `/auth/me` nunca passa pelo cache.
- **`429` geral**: fora da troca de senha, um `429` da API passa a mostrar "Muitas requisições. Aguarde um instante.". A troca de senha continua com "Muitas tentativas. Tente novamente em alguns minutos.".
- **Medição**: o log do cliente da API ganha uma linha quando a resposta sai do cache do BFF (só a tag, sem chave nem dado). Antes e depois da mudança, o mesmo roteiro (navegação + 10 F5) é medido e o relatório vai para a tarefa.

## Non-goals

- Guardar dados no navegador (`localStorage`, `sessionStorage`, IndexedDB): fica de fora por LGPD (dados de menores e de saúde).
- ETag ou `304` na API, Redis, Runtime Cache da Vercel ou qualquer outro serviço de cache. O cache do BFF fica só em memória.
- Cache de `/auth/me` no servidor: quebraria a revogação de sessão depois da troca de senha.
- Limite de requisições na API e a medição no Spring (Micrometer/Actuator): são as subtarefas [Back] do `educare-backend`. Aqui só se trata o `429` que a API devolver.
- Limite por IP para usuários anônimos (login): é pergunta em aberto na tarefa.
- Invalidação do cache do BFF entre instâncias da Vercel: cada instância tem o próprio cache (veja design.md).
- Atualização otimista e dedupe de requisições simultâneas no BFF.

## Capabilities

### New Capabilities
<!-- Nenhuma: o cache do BFF entra em api-client. -->

### Modified Capabilities
- `api-client`: novo requisito do cache curto no servidor do front (TTL, LRU, separação por sessão, invalidação por tag, `/auth/me` fora) e novo requisito da mensagem de `429` geral.
- `classrooms`: novo requisito de dados reaproveitados e atualizados sem recarregar (5 min, SSR no F5, "Atualizado há…", invalidação só das consultas afetadas, inclusive das crianças ao renomear).
- `users`: novo requisito equivalente para a lista de usuários (1 min, SSR no F5, "Atualizado há…").
- `auth`: o requisito "Logout" passa a descartar também os dados da sessão guardados no servidor do front.

## Impact

- **Código**: `src/integrations/educare-api/queries.ts` (tempos por tipo), `functions.ts` (leituras pelo cache e invalidação nas gravações), novo `server-cache.ts` (LRU com TTL, só servidor), `auth.ts` (logout, troca de senha e o `429` da troca), `session.ts` (limpeza no `401`), `errors.ts` e `messages.ts` (mensagem de `429`), `client.ts` (log de acerto do cache), `integrations/tanstack-query/root-provider.tsx` (`defaultOptions`), `components/classrooms/classrooms-section.tsx` e `components/users/users-section.tsx` (mutations, "Atualizado há…"), rotas `_authenticated/configuracoes/turmas.tsx` e `usuarios.tsx` (`loader` e `pendingComponent`), `components/children/updated-at.tsx` (muda de pasta) e os testes de rota de Turmas e Usuários.
- **Dependências**: nenhuma nova. O hash do token usa `node:crypto`.
- **Infra**: nada novo. Depois do deploy, conferir nos logs da Vercel os acertos do cache e, no back, a queda das chamadas.
- **Ordem e sobreposição com outras changes**: não há change em andamento no front. Esta change parte do que a `add-children-pages` (arquivada em 2026-11-02) deixou pronto e não muda as chaves nem o comportamento das páginas de crianças. As leituras de crianças só passam a usar também o cache do BFF. No `educare-backend`, as subtarefas de medição e de limite de requisições (`429`) andam em paralelo: o front pode ir antes, porque `toApiError` já trata o `429`, e a linha de base da medição precisa ser registrada antes do deploy desta change.
