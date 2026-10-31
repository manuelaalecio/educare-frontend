# Design

## Context

Motivação e escopo em `proposal.md`; comportamento em `specs/settings/spec.md`, `specs/classrooms/spec.md` e `specs/app-layout/spec.md`.

Estado atual, lido no código:

- `src/routes/_authenticated/configuracoes.tsx` é uma página provisória (`UnderConstruction`). O `beforeLoad` de `_authenticated.tsx` já põe `user` (com `role`) no contexto das rotas filhas.
- O item "Configurações" da barra (`nav-items.ts`) já é só para `ADMIN` e aponta para `/configuracoes`. `isActive` e `pageTitle` já tratam caminhos abaixo do item, então `/configuracoes/turmas` destaca "Configurações" e mostra esse título no cabeçalho sem mudança de código.
- A integração com a API segue um padrão: a lógica fica em módulos com dependências injetadas (`auth.ts`), ligada ao Start em `functions.ts` com o middleware `authenticated` (token no contexto; `401` vira redirect para o login) e um `validator` Zod. Erros viram `ApiError` (`errors.ts`), e `toFormError` devolve um resultado serializável com `message` e `fieldErrors`. Mensagens fixas ficam em `messages.ts`.
- O padrão de modal é o de `minha-conta/index.tsx`: `Dialog` do shadcn controlado por estado, formulário do TanStack Form que é desmontado ao fechar, fechamento bloqueado durante o envio e `toast` do sonner (o `Toaster` já está em `__root.tsx`).
- `app-header.tsx` decide desktop e celular por CSS (`md:`), não por `useIsMobile`, para o HTML do SSR já sair certo.
- O router usa `setupRouterSsrQueryIntegration`, que trata redirects lançados dentro de queries.
- O contrato OpenAPI publicado do backend não tem `/api/v1/classrooms`. A tarefa de back define `ClassroomResponse` com `id`, `name`, `studentCount`, `maleCount`, `femaleCount` e `createdAt`, lista ordenada por nome e os status `201/200/204`, `400`, `403`, `404` e `409`.
- O canvas de design (pranchas "Turmas · lista", "· editar turma", "· excluir turma" e "· celular") define o layout e a maior parte dos textos; os que não aparecem nele estão em D11.

## Goals / Non-Goals

**Goals:**

- Um `USER` nunca vê o conteúdo de Configurações, nem por um instante no HTML do servidor.
- As regras de nome (tamanho, espaços) valem igual no front e na API, a partir de um único schema.
- A aba Usuários, numa change futura, só troca o conteúdo de `configuracoes/usuarios.tsx` e reaproveita o layout e o padrão dos modais.

**Non-Goals:**

- Atualização otimista da lista: o volume é pequeno, e buscar de novo garante a ordem e as contagens que a API calcula.
- Um componente genérico de "modal de formulário" ou de "tabela de CRUD" para o resto do app.
- Ordenar ou filtrar no front.

## Decisions

### D1. Rotas: `configuracoes.tsx` vira layout com a checagem de role

Arquivos em `src/routes/_authenticated/`:

- `configuracoes.tsx`: `beforeLoad` lê `context.user` e, se `role !== 'ADMIN'`, `throw redirect({ to: '/', replace: true })`; o componente é o cabeçalho da área (`h1`, subtítulo, abas) e o `<Outlet />`.
- `configuracoes/index.tsx`: só `beforeLoad` com `redirect({ to: '/configuracoes/usuarios', replace: true })`.
- `configuracoes/usuarios.tsx`: a aba provisória.
- `configuracoes/turmas.tsx`: a aba Turmas.

Como o `beforeLoad` do layout roda antes do das filhas e no servidor, o `USER` é redirecionado antes de qualquer HTML da área, e uma aba nova herda a regra. O `replace` evita que "voltar" leve de novo ao endereço barrado ou ao redirect.

Alternativas descartadas: checar a role em cada aba (fácil esquecer numa aba nova); esconder o conteúdo no componente (o conteúdo chega a ir no HTML); uma rota sem caminho (`_admin`) para todas as áreas de admin (só existe uma área assim hoje; dá para extrair quando houver a segunda).

### D2. Abas com `Link` do router

A navegação "Seções das configurações" é um `<nav aria-label>` com dois `Link` (ícones `UserRound` e `LayoutGrid` do lucide, o mesmo de "Turmas" na barra). O `Link` do TanStack Router já põe `aria-current="page"` e `data-status="active"` na aba ativa; o estilo usa `data-[status=active]:` (borda inferior `border-primary`, `text-foreground`) e `text-muted-foreground` nas outras, com `min-h-11`. A lista de abas fica numa constante no próprio layout.

Alternativas descartadas: o `Tabs` do Radix/shadcn (é para painéis na mesma página, com `role="tablist"` e setas; aqui cada aba é uma página com endereço, e o design usa `<nav>` com `aria-current`); abas por `?aba=` (a tarefa pede rota própria).

### D3. Lógica de turmas em `classrooms.ts`, ligada em `functions.ts`

Novo `src/integrations/educare-api/classrooms.ts`, no padrão de `auth.ts` (dependências injetadas, testável sem o Start):

- `Classroom` = `Pick<ClassroomResponse, 'id' | 'name' | 'studentCount' | 'maleCount' | 'femaleCount' | 'createdAt'>`.
- `listClassrooms(api)` → `ListResult = { ok: true; classrooms: Classroom[] } | { ok: false; message: string }`.
- `createClassroom(api, { name })`, `renameClassroom(api, { id, name })`, `deleteClassroom(api, { id })` → `ClassroomResult = { ok: true } | { ok: false; kind; message?; fieldErrors }`.
- Um `401` é relançado em todas, para o middleware `authenticated` levar ao login (como `performChangePassword`).

Em `functions.ts`, quatro server functions (`getClassrooms` e as três de escrita, todas `POST`, com `.middleware([authenticated])` e `.validator(...)`), que chamam essas funções com `createApiClient(context.token)`.

A listagem devolve um resultado em vez de lançar o `ApiError`, porque a server function só garante serializar valores simples; a classe de erro com `kind` e `fieldErrors` não atravessa para o navegador de forma confiável. A query (D4) converte o `{ ok: false }` em `throw new Error(message)` no navegador.

Alternativas descartadas: chamar a API do navegador (proibido pelo CLAUDE.md e pela spec `api-client`); lançar o `ApiError` na server function e ler os campos no navegador (depende da serialização de erros do Start); um único `classroomAction` com um campo `action` (validação e tipos mais confusos).

### D4. Lista com TanStack Query, buscada no navegador

`queries.ts` ganha `classroomsQuery = queryOptions({ queryKey: ['educare-api', 'classrooms'], queryFn })`. A aba usa `useQuery(classroomsQuery)` e trata `isPending` (skeleton), `isError` (mensagem e "Tentar de novo" com `refetch()`) e `data`. Sem `loader`: no SSR o `useQuery` não busca, então o HTML sai com o skeleton, e a busca acontece depois da hidratação. Depois de criar, renomear ou excluir, a página chama `queryClient.invalidateQueries({ queryKey: classroomsQuery.queryKey })`; enquanto busca de novo, a lista anterior continua na tela.

Alternativas descartadas: `loader` com `await ensureQueryData` (a navegação espera a API, o skeleton nunca aparece, e um erro da API vira a tela de erro da rota em vez do "Tentar de novo"); `loader` com `prefetchQuery` sem `await` (no SSR a busca começa e pode terminar depois da resposta, com comportamento difícil de prever); `useSuspenseQuery` (mesmos problemas de erro do `loader`); atualizar o cache com a resposta das mutações (a ordem e as contagens vêm da API).

### D5. Um schema para o nome, no front e na server function

Em `validation.ts`: `CLASSROOM_NAME_MAX_LENGTH = 60` e `classroomNameSchema = z.object({ name: z.string().trim().min(1, 'Informe o nome da turma.').max(60, 'Use no máximo 60 caracteres.') })`, mais `classroomIdSchema = z.object({ id: z.uuid() })` e as combinações para renomear (`id` + `name`) e excluir. O formulário usa o schema como validador `onSubmit` do TanStack Form; como o validador não transforma o valor, o formulário envia `classroomNameSchema.parse(value)` (já sem os espaços), e o `validator` da server function aplica o mesmo schema de novo. O tamanho é contado em unidades UTF-16, como o `String.length` do Java na API.

Alternativas descartadas: validar só na API (CA04 pede que nada seja enviado); `maxLength={60}` no input (cortaria o texto colado em silêncio, e os espaços das pontas contariam).

### D6. Componentes em `src/components/classrooms/`

- `classroom-table.tsx`: `Table` do shadcn (`npx shadcn@latest add table`) com `aria-label='Turmas'`, colunas e alinhamento do design (números à direita, `tabular-nums`, cabeçalho em maiúsculas pequenas), dentro de um `div` `hidden md:block`.
- `classroom-list.tsx`: `<ul aria-label='Turmas'>` com nome e resumo, dentro de `md:hidden`.
- `classroom-actions.tsx`: os dois botões de ícone (`Pencil`, `Trash2`), `size-11`, `aria-label` "Editar <nome>"/"Excluir <nome>" e `title` "Editar"/"Excluir"; o de excluir em `text-destructive`. Usado pela tabela e pela lista.
- `classroom-form.tsx`: conteúdo dos modais "Nova turma" e "Editar turma" (D7).
- `delete-classroom-dialog.tsx`: o modal de exclusão (D7).
- `classrooms-section.tsx`: a seção com o cabeçalho, os estados (D4) e o controle de qual modal está aberto.
- `format.ts`: textos derivados (D8).

Desktop e celular são decididos por CSS, como em `app-header.tsx`, para o HTML do SSR já sair certo e não haver troca de layout na hidratação. O elemento escondido por `display: none` sai da árvore de acessibilidade, então o leitor de tela não ouve a lista duas vezes.

Alternativas descartadas: `useIsMobile` (no SSR não se sabe a largura, e a tela trocaria de layout ao hidratar); `TanStack Table` (sem ordenação, filtro ou paginação, só acrescentaria abstração); `div` com `role="table"` como no canvas (o `<table>` nativo tem a mesma semântica sem ARIA à mão).

### D7. Modais: um estado só na seção, `Dialog` controlado

`ClassroomsSection` guarda `dialog: { type: 'create' } | { type: 'edit' | 'delete'; classroom: Classroom } | null` e um `pending`. Cada modal é um `Dialog` controlado (sem `DialogTrigger`, porque os gatilhos estão em cada linha), com o mesmo bloqueio de `minha-conta`: `onOpenChange` ignora o fechamento, e `onEscapeKeyDown`/`onInteractOutside` chamam `preventDefault()` enquanto `pending`. O formulário fica dentro do `DialogContent`, que é desmontado ao fechar, o que descarta valores e erros.

- Foco inicial: `onOpenAutoFocus` com `preventDefault()` e foco por `ref` no campo "Nome da turma" (criar/editar) ou em "Cancelar" (excluir, a escolha segura).
- Volta do foco: o `FocusScope` do Radix devolve o foco ao elemento focado antes de abrir (o botão da linha ou "Nova turma"). Se esse elemento saiu da tela (turma excluída ou que não existe mais), `onCloseAutoFocus` foca o botão "Nova turma" por `ref`.
- `ClassroomForm` segue `ChangePasswordForm`: props `mode` (`'create' | 'edit'`), `initialName`, `studentCount`, `placeholder`, `onSubmit` (devolve `ClassroomResult`), `onSuccess`, `onCancel` e `onPendingChange`; alerta geral no topo; erro da API por campo apagado ao digitar.
- Exclusão: `DialogTitle` "Excluir <nome>?", `DialogDescription`, `Alert variant='destructive'` com `TriangleAlert` e "Essa ação não pode ser desfeita.", e o botão `variant='destructive'`. O erro de `409` aparece num segundo alerta, acima dos botões.
- Resultado na seção: `ok` → fecha, `toast.success(...)` e `invalidateQueries`; `kind === 'not-found'` → fecha, `toast.error(messages.classroomNotFound)` e `invalidateQueries`; outros → o modal mostra `message`/`fieldErrors`.

Alternativas descartadas: `AlertDialog` para a exclusão (não fecha com clique fora, e a spec pede o mesmo comportamento dos outros modais); um `Dialog` por linha com `DialogTrigger` (dezenas de modais montáveis e estado espalhado); manter o modal aberto no `404` com um erro (a turma não existe mais; não há o que corrigir no modal).

### D8. Textos derivados e datas em `format.ts`

Funções puras: `plural(n, singular, plural)`; `classroomCountLabel(n)` ("Nenhuma turma cadastrada." para 0, "1 turma cadastrada. Elas aparecem nos gráficos do Início.", "N turmas cadastradas. …"); `studentSummary(c)` ("N alunos · X meninos e Y meninas", com singular); `studentsInClassroom(n)` ("N alunos nesta turma"); `formatCreatedAt(iso)` com `Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })`, como `memberSince`, para o SSR (UTC) e o navegador escreverem a mesma data; `nextClassroomPlaceholder(count)` ("Ex.: Turma N+1").

Alternativas descartadas: `Intl.PluralRules` (para pt-BR com estes textos, um `n === 1` é mais legível e dá o mesmo resultado); `date-fns` (dependência nova para uma linha); o fuso do navegador (diferença entre SSR e cliente).

### D9. Tratamento dos erros de turma

Em `classrooms.ts`, depois de `toFormError`:

- `409` ao criar ou renomear → `fieldErrors: { name: messages.classroomNameTaken }`, sem `message` geral.
- `409` ao excluir → `message: messages.classroomHasStudents`.
- `404` → `kind: 'not-found'`, tratado pela seção (D7).
- Os demais (`400`, `403`, `5xx`, rede, timeout) seguem `toFormError` e as mensagens da spec `api-client`.

Os textos de `409` são fixos no front, sem repassar o `detail` da API, porque o mesmo status tem sentidos diferentes em cada operação e o texto precisa bater com a spec. Nada do nome da turma vai para log: o `logging` do cliente já registra só método, caminho do contrato e status.

Alternativas descartadas: mostrar o `detail` da API (texto fora do controle do front e da spec); distinguir os `409` pelo `title` (acopla a um texto do back que não está no contrato).

### D10. Aba Usuários provisória

`configuracoes/usuarios.tsx` mostra uma `<section>` com `h2` "Usuários" e "Esta seção ainda está em construção.", no mesmo cartão das outras abas. Não reusa `UnderConstruction`, que tem `<main>` e `h1` próprios e duplicaria os da área.

Alternativas descartadas: mudar `UnderConstruction` para aceitar o nível do título (o componente vai sumir quando as áreas forem feitas; não vale complicá-lo); deixar `/configuracoes` abrir em Turmas (a tarefa pede a primeira aba).

### D11. Textos que não estão no canvas nem na tarefa

Definidos aqui e usados nas specs, todos em `messages.ts` ou `format.ts`:

- Validação: "Informe o nome da turma." e "Use no máximo 60 caracteres." (no padrão de `validation.ts`).
- `409`: "Já existe uma turma com esse nome." (a tarefa traz o texto sem ponto final; o ponto segue as outras mensagens) e "Esta turma tem alunos. Tire os alunos da turma antes de excluí-la.".
- `404`: "Essa turma não existe mais. A lista foi atualizada.".
- Avisos de sucesso: "Turma criada.", "Turma renomeada." e "Turma excluída." (a tarefa não pede aviso, mas os modais fecham sem outra confirmação, e `minha-conta` já usa toast).
- Lista vazia: subtítulo "Nenhuma turma cadastrada." e o texto "Crie a primeira turma para usá-la nos gráficos do Início.".
- Títulos de aba do navegador: "Turmas · Configurações · Educare" e "Usuários · Configurações · Educare".

Se a revisão preferir outros textos, a mudança fica nas specs, em `messages.ts`/`format.ts` e nos testes.

### D12. Ajustes de testes e helpers existentes

`src/testing/render-route.tsx` ganha os placeholders `/configuracoes/usuarios` e `/configuracoes/turmas` para os testes de redirect. `-under-construction.test.tsx` perde o caso de `/configuracoes`. Os testes que montam as rotas de Configurações mocam as server functions de turmas como os testes de `minha-conta` mocam `changeOwnPassword`.

## Testes

- **Unitário (Vitest):**
  - `format.ts` (`src/components/classrooms/format.test.ts`): subtítulo para 0, 1 e 2 turmas; resumo com plural e singular ("1 aluno · 1 menino e 0 meninas"); "1 aluno nesta turma"/"38 alunos nesta turma"; `formatCreatedAt` com "02/02/2026" para `2026-02-02T13:00:00Z` e "28/02/2026" para `2026-03-01T02:30:00Z`; placeholder "Ex.: Turma 3" com 2 turmas.
  - `classroomNameSchema` (`validation.test.ts`): vazio, só espaços, 60 e 61 caracteres, e o trim de "  Turma 3 ".
  - `classrooms.ts` (`classrooms.test.ts`, com a API falsa como em `auth.test.ts`): lista `200` devolve só os campos de `Classroom`; lista `500` devolve `{ ok: false, message }`; criar envia o nome sem espaços e devolve `ok`; `409` ao criar/renomear vira erro no campo `name`; `409` ao excluir vira a mensagem de alunos; `404` vira `not-found`; `400` com `errors` devolve `fieldErrors.name`; `401` é relançado.
- **Testing Library:**
  - `src/routes/-settings.test.tsx`: `USER` em `/configuracoes/turmas` e em `/configuracoes` vai para `/`; `ADMIN` em `/configuracoes` vai para `/configuracoes/usuarios`; cabeçalho, subtítulo e abas com `aria-current` certo; clicar em "Usuários" troca de aba; aba Usuários provisória.
  - `src/routes/-classrooms.test.tsx`: lista na tabela (ordem, contagens, data, subtítulo) e na lista do celular (resumo), consultando cada uma com `within`; skeleton enquanto a busca não termina; lista vazia; erro com "Tentar de novo" que busca de novo; criar (foco no campo, placeholder, trim, modal fecha, toast, nova busca); validação local sem chamar a server function; `409` no campo e `aria-describedby`; editar com o nome preenchido e "N alunos nesta turma"; excluir com foco em "Cancelar", cancelar sem chamar a API, confirmar, e `409` com o alerta; `404` fecha, mostra o aviso e busca de novo; botões desabilitados e `Esc` ignorado durante o envio; `Esc` descarta o que foi digitado e devolve o foco.
  - `app-header.test.tsx` (ou `nav-items.test.ts`): título "Configurações" e item ativo em `/configuracoes/turmas`.
- **Manual:**
  - Com o backend de turmas rodando: criar, renomear e excluir turmas; tentar um nome duplicado com outra caixa ou acento ("turma 1", "Turmá 1"); excluir numa aba uma turma aberta para edição em outra (`404`).
  - Conferir contra as pranchas em 1440 px, em 390 px e no modo escuro, incluindo o contraste do botão "Excluir turma" no modo escuro (o `destructive` do shadcn usa `bg-destructive/60` com texto branco; se não passar de 4,5:1, ajustar a classe no modal).
  - Entrar como `USER`: o item "Configurações" não aparece e `/configuracoes/turmas` digitado leva ao Início.
  - Navegação só por teclado nas abas, nos botões das linhas e nos três modais.

## Risks / Trade-offs

- [O contrato de turmas não está publicado; nomes de campo diferentes dos da tarefa quebram o código] → A primeira tarefa regenera `schema.gen.ts` (publicado ou local, com `API_CONTRACT`), e `Classroom` é um `Pick` do tipo gerado: qualquer diferença aparece no `npm run typecheck`. Até lá, os componentes e testes usam dados de teste no formato da tarefa.
- [A ordem da lista depende da API] → É regra do contrato (lista ordenada por nome, sem diferenciar maiúsculas e acentos, como o índice único); ordenar no front com `localeCompare` poderia divergir da API. Um teste de `classrooms.ts` garante que a ordem recebida é mantida.
- [A role fica no cache da sessão por até 5 minutos; um `ADMIN` rebaixado ainda vê a área nesse intervalo] → A API responde `403` a qualquer chamada, e a aba mostra "Você não tem permissão para fazer isso."; numa carga completa, a sessão é relida.
- [Skeleton em toda carga completa, mesmo com a API rápida] → Escolha consciente (D4) para manter os estados de erro na aba; a lista tem poucas turmas e a API deve responder em até 500 ms.
- [Tabela e lista ficam as duas no DOM] → O custo é pequeno com até 50 turmas, e o `display: none` tira a escondida da árvore de acessibilidade; nos testes, a consulta é feita dentro de cada uma com `within`.

## Migration Plan

1. Fazer o deploy do front depois que a API de turmas estiver em produção: sem ela, a aba mostra o erro "Tentar de novo" (o `404` da rota inexistente vira mensagem de erro), mas o resto do app funciona.
2. Não há variável de ambiente nem dado a migrar.
3. Rollback: reverter o commit; `/configuracoes` volta a ser a página provisória, e a API de turmas continua sem uso.
