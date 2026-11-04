# Design

## Context

O que já existe e molda a abordagem (a motivação está em proposal.md, "Why"):

- **Padrão de dados da `add-children-pages`**: `queries.ts` tem a fábrica `keys` (`['educare-api', 'classrooms' | 'users' | 'children' | 'session', ...]`) e o helper `loadQuery`, que busca de novo quando a consulta foi invalidada e, se não foi, devolve o que já está guardado. `root-provider.tsx` cria o `QueryClient` com um `MutationCache` que invalida `mutation.meta.invalidates` no sucesso, e o tipo do `meta` já está registrado em `Register`. As mutations de crianças (`components/children/mutations.ts`) lançam `ApiFieldError` no `{ ok: false }`. `components/children/updated-at.tsx` mostra "Atualizado agora" / "Atualizado há N min" com o botão "Atualizar".
- **Turmas e Usuários ainda no modelo antigo**: `classroomsQuery` já tem `staleTime` de 5 min, mas `usersQuery(page)` não tem nenhum. As duas abas buscam só no navegador (sem `loader`), chamam as server functions direto (`useServerFn`, sem `useMutation`) e, no `done()`, chamam `queryClient.invalidateQueries` à mão, tanto no sucesso quanto no `404`. Os formulários (`ClassroomForm`, `UserForm`, `ResetPasswordForm`, os modais de excluir) recebem `onSubmit: (values) => Promise<ClassroomResult | UserResult>` e tratam `{ ok: false }` pelos campos.
- **Server functions**: em `functions.ts`, cada leitura chama o módulo da área com `createApiClient(context.token)`, e o `authenticated` injeta o token a partir do cookie `httpOnly`. `getCurrentUser` (`/auth/me`) não usa o middleware. O `client.ts` já registra `[educare-api] <método> <rota do contrato> <status> <ms>`, sem corpo nem headers.
- **`429`**: `toApiError` já converte o `429` em `too-many-requests`, e `messageFor` devolve "Muitas tentativas. Tente novamente em alguns minutos.", texto pensado para a troca de senha.
- **Deploy**: o front roda na **Vercel** (`vercel.json`, Nitro), não na VM da API, como a tarefa supunha. Uma função da Vercel pode ter várias instâncias, e cada cold start começa do zero. Com a usuária, ficou decidido manter o cache do BFF em memória, como melhor esforço por instância (D12).

## Goals / Non-Goals

**Goals:**
- Turmas e Usuários no mesmo padrão das crianças: `staleTime` por tipo, invalidação declarada na mutation, dados no SSR, "Atualizado há…".
- Uma só tabela dizendo o que cada gravação deixa velho, usada no navegador e no BFF.
- Cortar as chamadas repetidas do F5 com um cache no BFF que nunca entrega a uma sessão o que foi buscado com o token de outra.
- Logs que permitam medir antes e depois, sem dado pessoal.

**Non-Goals:**
- Os itens da seção "Non-goals" da proposal: nada persistido, nenhum serviço novo, `/auth/me` fora do cache, nada do back.
- Mudar o comportamento das páginas de crianças além de passarem pelo cache do BFF.
- Dedupe de leituras simultâneas no BFF. Os F5 seguidos chegam um depois do outro, e o ganho de juntar requisições paralelas não paga a complexidade.

## Decisions

### D1. Tempos por tipo num só lugar
`queries.ts` ganha `const staleTimes = { session: 5 * 60_000, classrooms: 5 * 60_000, users: 60_000, children: 60_000 }`, e cada `queryOptions` usa o seu (`CHILDREN_STALE_TIME` sai). `usersQuery(page)` passa a ter `staleTime: staleTimes.users`. `createQueryClient()` ganha `defaultOptions: { queries: { retry: false } }`, e o `retry: false` repetido em cada consulta sai. Com isso, `render-route.tsx` não precisa mais do `setDefaultOptions`. `refetchOnWindowFocus` continua no padrão: ele só busca de novo quando os dados já venceram, e é isso que queremos.
- *Descartado*: um `staleTime` padrão no `defaultOptions`. Esconde o tempo de cada tipo, e a spec define um tempo por tipo.
- *Descartado*: `refetchOnWindowFocus: false`. Ainda dentro do `staleTime`, ele não busca nada. Desligar faria a lista vencida continuar velha quando a pessoa volta à aba.

### D2. Tabela de invalidação compartilhada (`invalidation.ts`)
Novo módulo isomórfico, sem import de servidor:
```ts
export type Tag = 'classrooms' | 'users' | 'children'
export const invalidates = {
  createClassroom: ['classrooms'],
  renameClassroom: ['classrooms', 'children'], // o nome da turma aparece nas crianças
  deleteClassroom: ['classrooms'],
  createUser: ['users'], updateUser: ['users'],
  resetUserPassword: ['users'], deleteUser: ['users'],
  createChild: ['children', 'classrooms'], // as contagens mudam
  updateChild: ['children', 'classrooms'],
  deleteChild: ['children', 'classrooms'],
} as const satisfies Record<string, readonly Tag[]>
export const keysOf = (tags: readonly Tag[]) => tags.map((tag) => keys[tag])
export const shouldInvalidate = (result) => result.ok || result.kind === 'not-found'
```
A fábrica `keys` sai de `queries.ts` para `keys.ts` (e `queries.ts` a reexporta): assim, `functions.ts` importa a tabela sem o ciclo `functions → invalidation → queries → functions`. No navegador, `meta: { invalidates: keysOf(invalidates.renameClassroom) }`. No BFF, `serverCache.invalidate(invalidates.renameClassroom)` (D8). `components/children/mutations.ts` troca a constante local por `keysOf(invalidates.createChild)` etc., sem mudar o comportamento. A tag é o segundo item da chave (`keys.classrooms = ['educare-api', 'classrooms']`), e um teste garante que `keysOf` devolve exatamente `keys.*`.
- *Descartado*: listas de chaves espalhadas em cada hook e em cada server function. Basta esquecer uma vez para o navegador e o BFF discordarem sobre o que está velho.
- *Descartado*: `deleteClassroom` invalidar crianças. A API só exclui turma sem crianças e sem histórico, então nenhuma página de criança mostra a turma excluída.

### D3. Turmas e Usuários com `useMutation`, sem mudar os formulários
Novos hooks em `components/classrooms/mutations.ts` (`useCreateClassroom`, `useRenameClassroom`, `useDeleteClassroom`) e `components/users/mutations.ts` (`useCreateUser`, `useUpdateUser`, `useResetUserPassword`, `useDeleteUser`), todos sobre um `useFormMutation(call, tags)` comum em `components/form-mutation.ts`. O `mutationFn` devolve o resultado quando `shouldInvalidate(result)`, ou seja, no sucesso e também no `{ ok: false, kind: 'not-found' }`, para o `MutationCache` invalidar e a lista perder a linha que já não existe. Nos outros `{ ok: false }`, lança `ApiFieldError`. O `run()` de cada seção chama `formResult(mutation.mutateAsync(...))`, que converte o `ApiFieldError` de volta em `{ ok: false, kind, message, fieldErrors }` (e o redirect do `401` num resultado sem mensagem, porque a navegação para o login já está acontecendo). Assim, `ClassroomForm`, `UserForm`, `ResetPasswordForm` e os modais de excluir continuam recebendo `Promise<ClassroomResult | UserResult>` sem mudança. O `void queryClient.invalidateQueries(...)` sai dos dois `done()`. Na edição de si mesmo, a exceção continua explícita em `users-section.tsx`: `await queryClient.invalidateQueries({ queryKey: keys.session })` e `router.invalidate()`, porque depende do id editado e não cabe numa tabela fixa. `usersQueryKey` sai de `queries.ts` (vira `keys.users`).
- *Descartado*: invalidar no `MutationCache` olhando `data.ok`. Mudaria a regra que as crianças seguem ("falhou → lançou → nada invalidado", D3 da `add-children-pages`) e espalharia o conhecimento do formato do resultado pelo `root-provider`.
- *Descartado*: os formulários passarem a tratar `ApiFieldError`. Mexeria em seis componentes e seus testes sem mudar nada que se veja.

### D4. Dados no `loader` em Turmas e Usuários
`configuracoes/turmas.tsx`: `loader: ({ context }) => loadQuery(context.queryClient, classroomsQuery)` e `pendingComponent: ClassroomsPending` (a seção com os marcadores de carregamento, exportada de `classrooms-section.tsx`). `configuracoes/usuarios.tsx`: `loaderDeps: ({ search }) => ({ pagina: search.pagina ?? 1 })`, um `loader` que chama `loadQuery(queryClient, usersQuery(deps.pagina))` e não espera quando `cause === 'stay'` (trocar de página na própria aba mantém a página anterior na tela, com `keepPreviousData`, como em `/criancas`), e `pendingComponent: UsersPending`. Os componentes continuam com `useQuery` e o ramo `isPending`, para o caso de o `loader` não ter esperado, e usam `retryOnMount: false`, como `/criancas`: sem isso, um erro vindo do `loader` seria buscado de novo no mount, e a aba nunca mostraria o erro com "Tentar de novo". O `beforeLoad` de `configuracoes.tsx` já tira quem não é `COORDENADOR` antes do `loader`, então um `EDUCADOR` nunca chega a pedir a lista. O `setupRouterSsrQueryIntegration` já desidrata o cache no HTML, e com os `staleTime` de D1 o navegador não repete a chamada.
- *Descartado*: `useSuspenseQuery`. Tiraria das abas o estado de erro com "Tentar de novo" que a spec exige.

### D5. `UpdatedAt` num lugar comum
`components/children/updated-at.tsx` vai para `components/updated-at.tsx`, e `updatedAtLabel` vai de `components/children/format.ts` para `components/format.ts`, com o teste junto. `children-section.tsx` passa a importar do novo lugar. As duas abas mostram `<UpdatedAt updatedAt={query.dataUpdatedAt} refreshing={query.isFetching} onRefresh={() => void query.refetch()} />` abaixo do subtítulo, só com dados (`query.isSuccess` em Turmas, `data && !query.isError` em Usuários).

### D6. `server-cache.ts`: LRU com TTL em memória
Novo módulo só de servidor (`import '@tanstack/react-start/server-only'`) com uma fábrica testável e uma instância do módulo:
```ts
createServerCache({ ttlMs = 30_000, maxEntries = 500, now = Date.now, log = console.info })
  read<T extends { ok: boolean }>(session, tag, key, load: () => Promise<T>): Promise<T>
  invalidate(tags: readonly Tag[]): void      // todas as sessões (RN01)
  clearSession(session): void                 // logout, troca de senha, 401
export const serverCache = createServerCache()
```
- A chave interna é `` `${session}\u0000${tag}\u0000${key}` ``, em que `key` é o nome da leitura mais o `JSON.stringify` da entrada validada (`list`, `list:{"page":2}`, `detail:{"id":"…"}`). Um `Map` guarda as entradas em ordem de uso: um acerto apaga e reinsere a entrada, e um `set` além de 500 apaga a primeira. Uma entrada vencida é apagada no acesso.
- Só guarda `result.ok === true`. Erro e `{ ok: false }` passam direto (spec: "Erro não é guardado").
- **Corrida com a invalidação**: cada tag tem um contador de geração. `read` anota a geração das tags antes do `load` e só guarda se ela não mudou. Sem isso, uma leitura que começou antes de uma gravação e terminou depois guardaria a lista velha por mais 30 s.
- No acerto, `log(`[educare-api] cache ${tag} hit`)`: só a tag, nunca a chave (pode ter `nome=joao`), a sessão ou o valor (RNF03).
- Os valores (`TTL`, `500`) são constantes do módulo, e não variáveis de ambiente. A tarefa os trata como valores iniciais, e mudar é um commit.
- *Descartado*: o pacote `lru-cache`. É uma dependência nova para umas 40 linhas que o `Map` resolve.
- *Descartado*: `useStorage`/cache do Nitro e o Runtime Cache da Vercel. Podem persistir fora da memória ou ir para outro serviço, o que bate de frente com RNF01/RNF04 e com a LGPD (dados de crianças e de saúde).

### D7. Sessão = hash SHA-256 do token
`session = createHash('sha256').update(token).digest('hex')` (`node:crypto`), calculado em `functions.ts` a partir do `context.token`. Só quem tem exatamente aquele token chega às entradas, e toda entrada nasceu de uma chamada que a API aceitou com ele. O token em si não fica no cache (o hash basta, e o token não aparece num dump de memória da estrutura). Isso atende o "por usuário" da tarefa com uma granularidade mais fina, por sessão: dois navegadores da mesma pessoa não compartilham entradas.
- *Descartado*: usar o `sub` do JWT como chave. O BFF não verifica a assinatura, então um token forjado com o `sub` de outra pessoa leria o cache dela sem a API ser consultada.
- *Descartado*: o `id` vindo de `/auth/me` em cada leitura. É justamente a chamada extra que queremos evitar nas navegações.

### D8. Ligação em `functions.ts`
As leituras com o middleware `authenticated` passam pelo cache:
```ts
.handler(({ data, context }) =>
  serverCache.read(sessionOf(context.token), 'users', `list:${JSON.stringify(data)}`,
    () => listUsers(createApiClient(context.token), data)))
```
`getClassrooms` (`classrooms`, `list`), `getUsers` (`users`), `getChildren`, `getChild` e `getChildClassrooms` (`children`). `getCurrentUser` **não** passa (RN02). As gravações chamam um helper `afterWrite(result, invalidates.x)`, que faz `serverCache.invalidate(tags)` quando `shouldInvalidate(result)` e devolve o resultado. Um `401` lançado pela gravação não invalida nada: o middleware já trata o caso e limpa a sessão (D9).
- *Descartado*: cache no `client.ts` (no nível do `fetch`). Seria preciso reconhecer a rota e o método para saber o que guardar e o que invalidar, e o `GET /auth/me` passaria pelo mesmo caminho.

### D9. Limpeza da sessão: logout, troca de senha e `401`
- `server-cache.ts` exporta `forgetSession(token)`, que faz `serverCache.clearSession(sessionOf(token))`. `auth.ts` e `session.ts` recebem esse callback injetado (`forgetSession?: (token) => void`), como os cookies: os dois módulos não importam o cache (`session.ts` também vai para o navegador, por causa de `SESSION_EXPIRED`), e os testes rodam sem o Start.
- `performLogout` lê o cookie, chama `forgetSession(token)` quando há token e só então apaga o cookie.
- `performChangePassword`, no sucesso, limpa a sessão do token antigo (o novo começa vazio). As outras sessões com tokens antigos continuam com o que já tinham lido por até 30 s, mas o próximo F5 delas chama `/auth/me` e recebe `401` (spec "Sessão revogada").
- `runWithSession` (middleware) e `fetchSession` (`/auth/me` no SSR), no `401`, chamam `forgetSession` antes de apagar o cookie.

### D10. Mensagem do `429`
`messages.tooManyRequests = 'Muitas requisições. Aguarde um instante.'`, e `messageFor` passa a devolvê-la para `too-many-requests`. `performChangePassword` converte o `too-many-requests` em `messages.tooManyAttempts` antes de devolver, para manter a mensagem da spec de `auth`. As listas já transformam `result.message` no erro da consulta, e os modais já mostram `message` no alerta, então o texto novo aparece nos dois lugares sem mudar componente. O `retry: false` de D1 garante que o `429` não dispara novas tentativas.

### D11. Medição
O roteiro, igual antes e depois e registrado na tarefa do ClickUp, é: login como coordenadora; Configurações › Usuários → Turmas → Início → Turmas; renomear uma turma; `/criancas` → detalhes → voltar; 10 F5 em `/configuracoes/usuarios`. Contam-se as linhas `[educare-api] GET …` e `cache … hit` nos logs da Vercel (Runtime Logs, filtradas pelo horário) e as chamadas por rota do Actuator do back (subtarefa [Back]). O p95 sai do back, e o front entrega a contagem e o tempo de cada chamada que fez. A linha de base é tirada **antes** de qualquer commit desta change chegar a produção.
- *Descartado*: uma métrica própria no front (endpoint ou contador). Precisaria de armazenamento ou de um endpoint novo; o log que já existe, mais o do cache, basta para contar.

### D12. Várias instâncias na Vercel: melhor esforço
Cada instância tem o próprio `serverCache`. Uma gravação limpa o cache só da instância que a recebeu, e uma leitura em outra instância pode devolver, por até 30 s, a lista de antes. A usuária aceitou esse comportamento, e a spec registra o atraso. Os 10 F5 seguidos da mesma pessoa tendem a cair na mesma instância quente (Fluid compute). Se não caírem, o pior caso é uma chamada de dados por instância.
- *Descartado*: tirar o cache do BFF, que deixaria o CA03 sem atender.
- *Descartado*: o Runtime Cache da Vercel (veja D6).

## Testes

**Unitários (Vitest, ambiente `node`):**
- `server-cache.test.ts` (relógio e log injetados): acerto dentro de 30 s sem chamar `load`; erro e `{ ok: false }` não guardados; vencido em 30 001 ms; LRU (a 501ª entrada derruba a menos usada, e um acerto renova); sessões separadas; `invalidate(['classrooms'])` limpa a tag em todas as sessões e mantém `users`; `clearSession` limpa só aquela sessão; corrida (gravação durante o `load` → resultado não guardado); log do acerto só com a tag; `sessionOf` determinístico e diferente do token.
- `invalidation.test.ts`: `keysOf` devolve `keys.*`; `renameClassroom` inclui `children`; `shouldInvalidate` (ok, not-found, conflict).
- `errors.test.ts`: `429` → "Muitas requisições. Aguarde um instante.".
- `auth.test.ts`: troca de senha com `429` continua com "Muitas tentativas…"; troca bem-sucedida limpa a sessão antiga; logout limpa a sessão antes de apagar o cookie.
- `session.test.ts`: `401` limpa a sessão do cache.
- `queries.test.ts`: `usersQuery` com `staleTime` de 1 min; `createQueryClient` sem novas tentativas por padrão.
- `components/format.test.ts`: os casos de `updatedAtLabel`, movidos de `children/format.test.ts`.

**Testing Library (rotas reais com `renderRoutes` e server functions simuladas):**
- `-classrooms.test.tsx`: lista vinda do `loader`; voltar à aba em menos de 5 min sem nova chamada; criar/renomear/excluir buscam só turmas (o mock de `getUsers` não é chamado de novo); renomear marca `keys.children` como invalidada; `409` sem nova busca; `404` com o toast e a lista buscada de novo; "Atualizado agora" e "Atualizar"; `429` na lista com "Muitas requisições. Aguarde um instante." e "Tentar de novo".
- `-users.test.tsx`: `?pagina=2` vinda do `loader`; voltar em menos de 1 min sem nova chamada; criar busca só usuários; `409` sem nova busca; editar a si mesmo recarrega a sessão; "Atualizar" busca só a página mostrada; `429` no modal "Novo usuário".
- `-children-cache.test.tsx` e os testes de crianças continuam passando com os imports novos (`UpdatedAt`, `keysOf`).

**Manual:**
- F5 em `/configuracoes/turmas` e em `/configuracoes/usuarios?pagina=2`: sem skeleton, e a aba Network sem a server function da lista.
- Roteiro de D11 antes (linha de base) e depois do deploy, com o relatório anexado à tarefa.
- CA04 com dois navegadores (Ana e Bruno) em produção: criar uma turma num, F5 no outro, e anotar se houve atraso entre instâncias.
- CA06: sair com Ana, entrar com Carlos no mesmo navegador e conferir que nenhuma lista da Ana aparece.
- Logs da Vercel: as linhas `cache … hit` só com a tag; nenhum nome, filtro, id ou token.

## Risks / Trade-offs

- [Token revogado lido do cache por até 30 s] Numa navegação interna (sem F5), uma sessão revogada em outro lugar ainda recebe do BFF o que ela mesma leu há menos de 30 s, sem a API conferir → só dados que aquele token já viu, e o F5 sempre passa por `/auth/me`. O `401` de qualquer chamada que vá à API limpa a sessão (D9).
- [Rebaixamento de função] Quem deixou de ser `COORDENADOR` ainda pode ver a lista de usuários guardada por até 30 s numa instância que não recebeu a gravação → `updateUser` invalida `users` na instância que recebeu, e o resto é o atraso aceito em D12.
- [Gravações fora do BFF] Uma mudança feita direto na API (Swagger, outro cliente) só aparece depois do TTL → aceito: 30 s.
- [Memória da função] 500 entradas de listas paginadas (20 itens de resumo) e detalhes de criança ficam na casa de poucos MB → o LRU limita, e a memória é conferida nos logs da Vercel depois do deploy.
- [Estado de módulo no dev] O HMR do Vite pode recriar o módulo e zerar o cache → só em desenvolvimento, sem efeito em produção.
- [Corrida da geração] A regra das gerações depende de toda gravação passar por `afterWrite` → o teste de `invalidation.ts` cobre a tabela, e um teste de `functions` confere que cada gravação usa a sua entrada.
- [Dívida técnica: "Atualizar" responde do cache do BFF] Visto no teste local de 2026-11-04 (nos logs, `cache classrooms hit` e `cache users hit` depois do clique). O botão pede a lista ao BFF, mas, se a sessão buscou a mesma lista há menos de 30 s, o BFF devolve o que guardou, sem ir ao Spring, e a tela mostra "Atualizado agora". Só faz diferença quando a mudança veio de outra instância da Vercel ou direto na API: na mesma instância, a gravação já limpou o cache. Aceito por enquanto: o TTL é curto e a escola tem no máximo uns 5 usuários. **Se alguém relatar que "Atualizar não trouxe a mudança"**, a correção é "Atualizar" pedir a leitura com `fresh: true`. As 5 leituras de `functions.ts` aceitariam o parâmetro, fora da chave do cache, e o BFF ignoraria a entrada guardada, buscaria no Spring e guardaria o resultado novo. As navegações e os F5 continuariam usando o cache.
- [Mensagem de `429` no login] Se o back passar a limitar o login por IP, o formulário de login vai mostrar a mensagem geral → aceitável; uma mensagem própria fica para quando a pergunta em aberto for decidida.

## Migration Plan

1. Antes de qualquer commit desta change chegar a produção: rodar o roteiro de D11 e registrar a linha de base na tarefa.
2. Navegador (D1–D5 e D10): pode ir sozinho, sem o back.
3. BFF (D6–D9, D11): no mesmo deploy ou no seguinte. Rollback: reverter o commit. O cache é só memória, então não há estado a migrar nem a limpar.
4. Depois do deploy: repetir o roteiro, comparar com a linha de base e conferir a memória nos logs da Vercel. O `429` da API chega quando a subtarefa [Back] for publicada, e o front já está pronto para ele.

## Open Questions

- Os tempos (5 min, 1 min, 30 s, 500 entradas) são iniciais. A medição de D11 pode ajustá-los, e isso muda só os números da spec.
- Se o atraso entre instâncias (D12) aparecer na prática, avaliar numa change futura um canal de invalidação entre instâncias sem persistir dados.
