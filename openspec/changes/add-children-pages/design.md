# Design

## Context

O que já existe e molda a abordagem (motivação em proposal.md, "Why"):

- **Integração com a API**: cada área tem um módulo com a API injetada (`classrooms.ts`, `users.ts`) que devolve resultados serializáveis (`{ ok: true, ... } | { ok: false } & FormError`) e relança só o `401`; `functions.ts` liga esses módulos a server functions com o middleware `authenticated` e um `validator` Zod. `errors.ts` converte o `ProblemDetail` em `ApiError` e `toFormError` (com `fieldErrors` só no `400`).
- **Consultas**: `queries.ts` tem `currentUserQuery` (`['educare-api', 'session']`, 5 min), `classroomsQuery` (`['educare-api', 'classrooms']`, sem `staleTime`) e `usersQuery(page)`. Turmas e Usuários buscam no navegador (sem `loader`) e chamam `queryClient.invalidateQueries` à mão depois de cada gravação. O `QueryClient` é criado em `root-provider.tsx` sem opções, e `router.tsx` já liga o SSR com `setupRouterSsrQueryIntegration` e `defaultPreload: 'intent'`.
- **Formulários**: TanStack Form com `validators.onSubmit` Zod e `schema.parse(value)` no `onSubmit` (o validador não transforma o valor), como em `classroom-form.tsx`.
- **Roles**: `COORDENADOR` e `EDUCADOR` (`COORDINATOR_ROLE` em `validation.ts`); a tarefa do ClickUp ainda diz `ADMIN`/`USER`, que aqui significam `COORDENADOR`/`EDUCADOR`.
- **Não existe página de não encontrado**: a raiz não define `notFoundComponent`, então `/alunos`, depois de removida, cairia no padrão do TanStack Router, em inglês.
- **Contrato**: o `educare-backend` tem a change `add-child-crud` (CRUD sem turma nem certidão); o vínculo com a turma, a certidão, o filtro `classroomId` e `GET /children/{id}/classrooms` vêm das subtarefas [Back] e ainda não estão no `openapi/educare-api.json`. Pelo ClickUp: `POST`/`PUT` recebem `classroomId`; as respostas trazem `classroom: { id, name }`; a listagem é `PagedModel` (`page` a partir de 0, 20 por página, `sort=name`) com `ChildSummaryResponse`; a certidão fica em colunas `birth_certificate_*`.

## Goals / Non-Goals

**Goals:**
- Criar o padrão de dados que as próximas telas vão seguir (chaves por recurso, invalidação declarada na mutation, `loader` com SSR), sem migrar ainda as telas antigas.
- Manter toda regra de negócio do front (validação, máscaras, idade, mascaramento, classificação de erros) em funções puras e testáveis fora dos componentes.
- Nenhum dado de criança em log, título de aba ou armazenamento do navegador.

**Non-Goals:**
- Atualização otimista: depois de gravar, os dados são buscados de novo.
- Um componente genérico de "CRUD" ou de formulário em seções compartilhado com Turmas e Usuários.
- Biblioteca de máscara de input: as três máscaras são simples o bastante para uma função própria.

## Decisions

### D1. Fábrica `keys` em `queries.ts`, compatível com as chaves atuais
```ts
export const keys = {
  session: ['educare-api', 'session'],
  classrooms: ['educare-api', 'classrooms'],
  users: ['educare-api', 'users'],
  children: ['educare-api', 'children'],
  childList: (filters: ChildFilters) => [...keys.children, 'list', filters],
  child: (id: string) => [...keys.children, 'detail', id],
  childClassrooms: (id: string) => [...keys.child(id), 'classrooms'],
} as const
```
`currentUserQuery`, `classroomsQuery` e `usersQuery` passam a usar `keys.*` com os **mesmos valores** de hoje, então as invalidações manuais de Turmas e Usuários continuam funcionando sem mudança. `classroomsQuery` ganha `staleTime: 5 * 60_000`. As consultas de crianças (`childrenQuery(filters)`, `childQuery(id)`, `childClassroomsQuery(id)`) têm `staleTime: 60_000` e `retry: false`; a lista também `placeholderData: keepPreviousData`. `ChildFilters` é `{ nome?: string; turma?: string; pagina: number }` — nunca dados de saúde ou documentos (LGPD).
- *Descartado*: chaves soltas por arquivo, como hoje. Invalidar "tudo de crianças" exigiria lembrar de cada chave; com a raiz `keys.children`, uma invalidação pega lista (todas as páginas e filtros), detalhes e histórico.

### D2. `MutationCache` global com `meta.invalidates`
`getContext()` cria o `QueryClient` com
```ts
mutationCache: new MutationCache({
  onSuccess: (_data, _vars, _ctx, mutation) => {
    for (const queryKey of mutation.meta?.invalidates ?? [])
      void queryClient.invalidateQueries({ queryKey })
  },
})
```
e o tipo do `meta` é registrado via `declare module '@tanstack/react-query' { interface Register { mutationMeta: { invalidates?: readonly QueryKey[] } } }`. A invalidação não é esperada (`void`), para a navegação depois de salvar não esperar o refetch das consultas ativas; as inativas ficam marcadas e são buscadas na próxima vez (D4). Os hooks `useCreateChild`, `useUpdateChild` e `useDeleteChild` (em `components/children/mutations.ts`) declaram `meta: { invalidates: [keys.children, keys.classrooms] }` — `keys.classrooms` porque as contagens das turmas mudam. Nenhum componente de crianças chama `invalidateQueries`.
- *Descartado*: `onSuccess` em cada `useMutation` invalidando à mão. É o que a tarefa de cache quer eliminar, e cada tela repetiria a lista de chaves.
- *Descartado*: esperar a invalidação no `onSuccess`. Atrasaria o "Criança cadastrada." pelo tempo do refetch da lista de turmas, que nem está na tela.

### D3. `ApiFieldError` lançado pela mutation
As server functions continuam devolvendo resultados serializáveis (`ChildResult`), como Turmas e Usuários. O `mutationFn` dos hooks converte `{ ok: false }` num `throw new ApiFieldError(result)` (classe em `errors.ts`, com `kind`, `message` e `fieldErrors`). Assim, uma gravação que falha nunca chega ao `onSuccess` do `MutationCache` e nada é invalidado (spec: "Uma gravação que falha SHALL NOT provocar nenhuma nova busca"). O formulário captura o `ApiFieldError` no `onSubmit` e o distribui pelos campos (D7).
- *Descartado*: a server function lançar o erro. Erros lançados numa server function são serializados pelo Start de um jeito que não preserva a classe nem os campos com segurança; o resultado `{ ok }` já é o padrão do projeto.

### D4. `loader` com SSR que respeita a invalidação
As rotas de crianças carregam no `loader` (que roda no SSR e no preload por intenção), com um helper `loadQuery(queryClient, options)` em `queries.ts`:
- sem dados em cache, ou com a consulta invalidada (`getQueryState(key)?.isInvalidated`) → `await queryClient.fetchQuery(options)`: depois de gravar, a página só aparece com os dados novos, sem piscar os antigos;
- com dados, só vencidos pelo tempo → `queryClient.ensureQueryData(options)`, que devolve na hora; o `useQuery` do componente atualiza em segundo plano;
- erros de busca são engolidos pelo helper (a consulta fica em erro), e o componente mostra a mensagem com "Tentar de novo". Só o `401` segue (o middleware já redireciona).

O `setupRouterSsrQueryIntegration` já desidrata o cache no HTML; com o `staleTime` de 1 min, o navegador não repete a chamada depois do F5. Os componentes usam `useQuery` (não `useSuspenseQuery`) para poder mostrar o estado de erro no lugar.

Rotas e o que carregam:
| Rota | `loader` |
| --- | --- |
| `criancas/index.tsx` | `childrenQuery(filtros)` + `classroomsQuery` (filtros via `loaderDeps`) |
| `criancas/nova.tsx` | `classroomsQuery` |
| `criancas/$childId/index.tsx` | `childQuery(id)` + `childClassroomsQuery(id)` |
| `criancas/$childId/editar.tsx` | `childQuery(id)` + `classroomsQuery` |

`childQuery` devolve `null` no `404` (e para um `childId` que não é UUID, sem chamar a API); o `loader` lança `notFound()` nesse caso, e a rota `$childId` define o `notFoundComponent` "Criança não encontrada". O `head` dessas rotas usa títulos fixos ("Criança · Educare", "Editar criança · Educare"), sem o nome (LGPD).
- *Descartado*: `ensureQueryData` puro, como sugere o ClickUp. Ele devolve dados invalidados sem buscar, e a lista voltaria mostrando a criança excluída até o refetch em segundo plano.
- *Descartado*: buscar só no navegador, como Turmas. Contradiz o requisito de F5 sem skeleton (spec "Dados de crianças atualizados sem recarregar").

### D5. Módulo `children.ts` no padrão de `classrooms.ts`
`integrations/educare-api/children.ts`, com a API injetada:
- `listChildren(api, { nome, turma, pagina })` → `GET /api/v1/children?name&classroomId&page=pagina-1&size=20&sort=name`, devolvendo `{ ok, children: ChildSummary[], page }`, com `ChildSummary = { id, name, birthDate, classroom: { id, name } }` (só o resumo, mesmo que a API mande mais);
- `getChild(api, { id })` → `{ ok: true, child: Child | null }` (`null` no `404`);
- `listChildClassrooms(api, { id })` → períodos `{ classroom: { id, name }, startDate, endDate | null }`, ordenados do mais recente para o mais antigo no front também, por segurança;
- `createChild`, `updateChild` (substituição completa, com `classroomId`), `deleteChild` (`404` → `{ ok: true, notFound: true }`, para o hook navegar com "Essa criança não existe mais." e ainda invalidar).

As server functions `getChildren`, `getChild`, `getChildClassrooms`, `createChild`, `updateChild` e `deleteChild` entram em `functions.ts`, com `authenticated` e o `validator` (D6). Nenhuma registra corpo, resposta ou id em log.
- *Descartado*: devolver o `ChildResponse` inteiro na lista. Mesmo que a API mude e mande mais campos, o front corta no servidor, e o navegador só recebe o resumo (spec "Proteção dos dados das crianças").

### D6. Schema do formulário e da server function em `validation.ts`
- `childFormSchema`: os valores do formulário são todos `string` (inclusive seletores, com `''` para "Não informar"), validados com as mensagens da spec. A certidão é um `z.discriminatedUnion('birthCertificateType', [...])` com `'NONE'`, `'NEW'` (`birthCertificateNumber`) e `'OLD'` (`registryOffice`, `book`, `page`, `term`), e o `superRefine` da matrícula usa a data de nascimento para conferir o ano do registro.
- `toChildRequest(values)`: converte para o corpo da API — trim, opcionais vazios → `undefined`, CPF/CEP/matrícula só com dígitos, seletores `''` → `undefined`, e só os campos do modelo de certidão escolhido.
- `childRequestSchema`: o mesmo conjunto de regras sobre o corpo já convertido, usado no `validator` das server functions de criar e alterar (com `id` na alteração).
- Regras puras exportadas e testadas sozinhas: `isValidCpf`, `isValidBirthCertificate(number, birthYear, currentYear)` (32 dígitos, 15º = 1, ano nos dígitos 11–14 entre o nascimento e hoje, dois dígitos verificadores pelo módulo 11 do Provimento 3/2009 do CNJ), `todayInSaoPaulo()` (`AAAA-MM-DD` por `Intl`, igual no SSR em UTC e no navegador).
- Os nomes dos campos do formulário são os mesmos do `ChildRequest` do contrato, então os `fieldErrors` do `400` caem nos campos sem tradução.
- *Descartado*: validar só no servidor. O CA exige erro antes de enviar e foco no primeiro campo.
- *Descartado*: `z.coerce.date()` para a data de nascimento. Um `Date` traz o fuso do runtime e desloca o dia; a data fica como string `AAAA-MM-DD`.

### D7. Classificação dos `409` por palavras do `detail`, num só lugar
O backend não diferencia os conflitos por código, e, diferente de Usuários, não dá para deduzir o motivo pelo pedido (CPF, RG e certidão podem mudar juntos). `children.ts` tem uma tabela `conflictField(detail)`: `detail` com "CPF" → `fieldErrors.cpf`; com "RG" → `fieldErrors.rg`; com "certidão" → `birthCertificateNumber` ou `birthCertificateTerm`, conforme o modelo enviado; sem correspondência → alerta com o `detail` (em pt-BR, sem dados pessoais). Para turmas, `classrooms.ts` usa o mesmo princípio: `detail` com "histórico" → `messages.classroomHasHistory`; qualquer outro `409` → `messages.classroomHasStudents`.
- *Descartado*: pedir ao back um `errors[].field` no `409` ou um `type` por conflito. É o mais robusto e fica sugerido à subtarefa [Back] (Open Questions); a tabela única e os testes limitam o estrago de uma mudança de redação.
- *Descartado*: mapear todo `409` para o CPF. Mostraria a mensagem no campo errado quando o conflito é o RG ou a certidão.

### D8. Rotas e filtros na URL
Arquivos em `src/routes/_authenticated/criancas/`: `index.tsx`, `nova.tsx`, `$childId/index.tsx`, `$childId/editar.tsx`; `alunos.tsx` é removido. A lista declara `validateSearch` com `nome` (trim, até 150, vazio → ausente), `turma` (`z.uuid()`) e `pagina` (inteiro ≥ 1), cada um com `.catch(undefined)` para ignorar valores inválidos. O campo de busca tem estado local e atualiza a URL com `navigate({ search, replace: true })` 300 ms depois da última tecla (um `useDebouncedValue` pequeno, sem biblioteca), voltando `pagina` para 1; o seletor de turma navega na hora. Página além da última → `navigate({ replace: true })` para a última, como em Usuários. Quando houver próxima página, a lista faz `prefetchQuery` dela. Links para os detalhes e o "Editar" usam `<Link preload='intent'>` (o padrão do router), que roda o `loader` e antecipa `childQuery(id)`.
- *Descartado*: filtros em `useState`. Perderiam-se no F5 e no voltar, contra o CA de "recarregar mantém os filtros".

### D9. Formulário em seções com TanStack Form
`components/children/child-form.tsx` recebe `mode`, `defaultValues` (de `childQuery` na edição, ou vazios), `classrooms` e a mutation (`useCreateChild` ou `useUpdateChild(id)`). `onSubmit` faz `await mutation.mutateAsync(toChildRequest(childFormSchema.parse(value)))`, marca `submitted` e navega para `/criancas/$childId` com o toast; um `ApiFieldError` vira `setFieldMeta` com o erro em cada campo (removido no `onChange` do campo) ou o alerta no topo. `onSubmitInvalid` foca o primeiro campo com erro, na ordem do formulário. O botão de enviar fica desabilitado com `form.state.isSubmitting`.
- Seletores: o `Select` do shadcn (Radix) não aceita `''` como valor de item, então "Não informar" usa o valor interno `'none'`, convertido para `''` no `onValueChange`.
- Máscaras: `formatMasked(value, pattern)` em `components/children/format.ts`, aplicada no `onChange` (só dígitos, até o tamanho do padrão), para CPF, CEP e matrícula.
- Certidão: o `onChange` do seletor de modelo zera os campos do outro modelo e os erros deles (`form.setFieldValue` + `setFieldMeta`).
- Aviso de troca de turma: `form.Subscribe` em `classroomId`, comparado com a turma atual, só na edição.
- Saída com alterações: `useBlocker({ shouldBlockFn: () => form.state.isDirty && !submitted, enableBeforeUnload: () => form.state.isDirty && !submitted, withResolver: true })`, com o `Dialog` "Sair sem salvar?" usando `proceed`/`reset`. "Cancelar" é um `Link`, então passa pelo mesmo bloqueio.
- Sem turmas: na rota `nova`, `classrooms.length === 0` troca o seletor pelo aviso e desabilita o envio; o link "Ir para Turmas" aparece se `user.role === COORDINATOR_ROLE` (contexto da rota `_authenticated`).
- *Descartado*: um formulário por seção (wizard). O design mostra uma página única, e a edição precisa ver tudo junto.

### D10. Detalhes, mascaramento e exclusão
`components/children/` traz `child-details.tsx` (cabeçalho e cartões), `child-documents.tsx` (estado local `revealed` por documento; volta a mascarado ao desmontar), `classroom-history.tsx` e `delete-child-dialog.tsx`. As funções puras ficam em `format.ts`: `ageLabel(birthDate, today)`, `formatDate('AAAA-MM-DD')` (por split, sem `Date`), `maskCpf`, `maskRg`, `maskBirthCertificate`, `formatBirthCertificate`, `oldCertificateLabel`, `periodLabel` e as traduções de gênero, raça/cor e estado civil. O botão "Excluir" aparece só se `user.role === COORDINATOR_ROLE`. `useDeleteChild` tem, além do `meta`, um `onSuccess` próprio que faz `queryClient.removeQueries({ queryKey: keys.child(id) })` antes de navegar para `/criancas` — senão a invalidação da raiz buscaria de novo a criança excluída, e o voltar mostraria os dados velhos. O modal reaproveita o `Dialog` e a regra "durante o envio não fecha" de Turmas.
- *Descartado*: buscar o CPF completo só ao clicar em "Mostrar". O ClickUp define que o dado já vem no detalhe; a máscara protege de quem olha a tela, não da rede.

### D11. "Alunos" → "Crianças" e página não encontrada
`nav-items.ts` troca o item para `{ title: 'Crianças', to: '/criancas', icon: Baby }` (ícone da `lucide-react`, já instalada); `pageTitle` passa a valer em `/criancas/*` sem mudança de código. `classrooms/format.ts` troca as palavras (os nomes `studentSummary`/`studentsInClassroom` ficam), a tabela troca a coluna, os modais trocam os textos, e `messages.ts` muda `classroomHasStudents` e ganha `classroomHasHistory`, além das mensagens de crianças. `components/layout/not-found.tsx` é registrado como `defaultNotFoundComponent` em `router.tsx`, com o `head` "Página não encontrada · Educare"; o Start responde `404` quando a rota não existe.
- *Descartado*: redirecionar `/alunos` para `/criancas`. A tarefa decide remover (não há links externos), e o redirecionamento ficaria para sempre no código.

### D12. "Atualizado há X min"
`components/children/updated-at.tsx` recebe `dataUpdatedAt` e o `refetch` da consulta da lista, re-renderiza a cada 30 s e mostra "Atualizado agora" (< 1 min) ou "Atualizado há N min". O botão "Atualizar" chama só `query.refetch()` e fica desabilitado durante o `isFetching`. Fica em `components/children/` até a tarefa de cache levá-lo para Turmas e Usuários.

## Testes

**Unitários (Vitest, sem DOM):**
- `validation.test.ts`: cada regra e mensagem de `childFormSchema` (obrigatórios, limites, data futura em 01/11/2026 com relógio fixo, CPF, CEP, RG), `isValidCpf`, `isValidBirthCertificate` (31 dígitos, DV trocado, 15º ≠ 1, ano antes do nascimento e depois de hoje, 2–3 matrículas reais anonimizadas que passam), `toChildRequest` (trim, máscaras, opcionais, só o modelo escolhido, "Não informar" sem certidão) e `childRequestSchema`.
- `components/children/format.test.ts`: `ageLabel` (0 meses, 1 mês, 8 meses, 1 ano, véspera do aniversário), `formatDate`, `maskCpf`, `maskRg`, `maskBirthCertificate`, `formatMasked`, `periodLabel`, traduções.
- `children.test.ts` com a API falsa: query string da lista (`page` = `pagina - 1`, `name`, `classroomId`), corte para o resumo, `404` → `null`, `409` de CPF/RG/certidão nos campos certos e o desconhecido em alerta, `400` com `errors`, `401` relançado, `deleteChild` com `404`.
- `classrooms.test.ts`: `409` com "histórico" → `classroomHasHistory`; outro `409` → `classroomHasStudents`.
- `queries.test.ts`: `keys` (valores atuais preservados, hierarquia de crianças), `MutationCache` invalida `meta.invalidates` no sucesso e nada no erro, `loadQuery` (sem cache → busca; fresco → não busca; invalidado → busca; erro → não lança).
- Testes atualizados: `classrooms/format.test.ts`, `nav-items.test.ts`.

**Testing Library (rotas reais com `renderRoutes` e server functions simuladas):**
- `-children-list.test.tsx`: tabela e cartões, só "Ver <nome>" para as duas roles, busca com debounce (timers falsos) e URL, filtro de turma, URL inválida, paginação e última página, vazio, vazio com filtro e "Limpar filtros", erro e "Tentar de novo", "Atualizado há" e "Atualizar".
- `-child-form.test.tsx`: obrigatórios e foco no primeiro, máscaras e corpo enviado, certidão nos dois modelos e troca de modelo, `409` e `400` nos campos e sem invalidação, alerta de servidor indisponível, botão desabilitado no envio, aviso de troca de turma, sem turmas (as duas roles), bloqueio de saída ("Continuar editando" / "Sair sem salvar"), sucesso com toast e navegação, 404 na edição.
- `-child-details.test.tsx`: seções, "Não informado", mascaramento e "Mostrar"/"Ocultar" sem nova chamada, certidão nos dois modelos, histórico, "Excluir" só para `COORDENADOR`, modal (cancelar, excluir com `removeQueries` e toast, `500` e `403` no modal, `404`), 404 da página e título de aba sem o nome.
- `-children-cache.test.tsx`: voltar à lista em menos de 1 min sem nova chamada; cadastrar invalida lista e turmas; erro não invalida.
- Atualizados: `app-sidebar.test.tsx`, `-under-construction.test.tsx` (sem Alunos), `-classrooms.test.tsx` (textos e `409` com histórico), `render-route.tsx` (placeholder `/criancas`), e um teste da página não encontrada.

**Manual:**
- Conferir contra as pranchas Crianças · lista, nova, editar, detalhes, excluir, lista celular, detalhes celular, detalhes modo escuro e as de Turmas, em 1440 px e 390 px, nos dois temas, com alvos de 44 px.
- F5 em `/criancas?nome=...` e em `/criancas/<id>`: aba Network sem chamada da lista/detalhe no navegador e sem skeleton; `404` no status de `/criancas/<id inexistente>` e `/qualquer-coisa`.
- Fechar a aba com o formulário alterado (confirmação do navegador).
- Fluxo completo contra o back local: cadastrar, trocar de turma, ver o histórico e as contagens em Configurações › Turmas, excluir.
- DevTools › Application: nada de criança em `localStorage`, `sessionStorage`, IndexedDB ou cookies.

## Risks / Trade-offs

- [Contrato ainda não publicado] Nomes dos campos da certidão (`birthCertificateType` `NEW`/`OLD`, `birthCertificateNumber`, `birthCertificateRegistryOffice`, `birthCertificateBook`, `birthCertificatePage`, `birthCertificateTerm`), o formato do histórico e os limites de cartório/livro/folha/termo são suposições a partir do ClickUp → as tarefas de infra e de "Crianças" no lugar de "Alunos" vêm antes; a integração começa com `npm run api:generate` e, se o contrato divergir, o design e a spec são ajustados antes de seguir.
- [Classificação de `409` por texto] Uma mudança de redação no back manda o erro para o alerta em vez do campo → tabela única em `children.ts`/`classrooms.ts`, testes com os textos atuais e a sugestão de um discriminador estável ao back.
- [Algoritmo da matrícula] Um DV calculado errado recusaria certidões válidas → testes com 2–3 certidões reais antes de ligar a regra; o back valida de novo, e uma divergência aparece no campo pelo `400`.
- [`isInvalidated` no `loader`] Depende de um detalhe do estado da consulta do TanStack Query → coberto por teste de `loadQuery`; se mudar numa atualização, o teste quebra.
- [Status 404 no SSR] Depende de o Start traduzir `notFound()` e a rota inexistente em `404` → conferência manual; se não traduzir, `setResponseStatus(404)` no `notFoundComponent` via função isomórfica, como `preventCaching`.
- [Bloqueio de saída e `beforeunload`] Navegadores mostram o próprio texto na confirmação de fechar a aba, não o nosso → aceito; o spec fala da confirmação do navegador.
- [Sobreposição com a tarefa de cache] Turmas passa a ter `staleTime` de 5 min, mas ainda invalida à mão → comportamento igual ao de hoje depois de gravar; a tarefa de cache remove a invalidação manual sem mudar as chaves.
- [Dados de saúde no cache do navegador durante a sessão] O detalhe fica no cache em memória por até o `gcTime` → nada é persistido; o logout já faz `queryClient.clear()`.

## Migration Plan

1. Pode entrar já, sem o back: página não encontrada, "Alunos" → "Crianças" (com `/criancas` provisória mostrando "em construção" até as páginas ficarem prontas, caso o deploy aconteça no meio), `keys`, `MutationCache`, `ApiFieldError` e `loadQuery`.
2. Com o contrato publicado: regenerar `schema.gen.ts` e fazer a integração e as páginas.
3. O deploy das páginas de crianças vai junto com o do back (ou depois dele). Rollback: reverter o commit do front; `/criancas` some e `/alunos` não volta (era uma página provisória).

## Open Questions

- Sugerir à subtarefa [Back] um discriminador estável nos `409` (campo em `errors` ou `type` do `ProblemDetail`), para substituir a tabela de D7 numa change futura sem mudar a spec.
- O valor de `staleTime` de 1 min para crianças é o inicial; a tarefa de otimização pode ajustá-lo sem mudar a spec além do número.
