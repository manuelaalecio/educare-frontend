# Design

## Context

A aba Turmas (`src/components/classrooms/*`) já define o padrão desta área. Ela tem uma seção com cabeçalho e botão, a tabela a partir de 768 px e a lista abaixo disso, um único `Dialog` com um `DialogState`, o foco devolvido ao botão que abriu o modal, a regra "durante o envio não fecha" e os erros da API vindos de `toFormError`. As server functions ficam em `functions.ts` e chamam a lógica em `classrooms.ts`, com a API injetada para os testes.

O que já existe na API e no front (veja proposal.md, "Why"):

- `GET /api/v1/users?page&size&sort` devolve `PagedModelUserResponse` (`content` e `page.{number,size,totalElements,totalPages}`), 20 por página e ordenado por `name`. `page` começa em 0.
- `POST` e `PUT /api/v1/users/{id}` têm as regras: `name` com até 150 caracteres, `login` com o formato `^[^@\s]+@[^@\s]+\.[^@\s]+$` e até 254 caracteres, `password` com 8 a 72 caracteres e até 72 bytes, e `role` como string.
- Erros `409` do backend: "Login já está em uso" (criar e editar), a mensagem de último coordenador (editar e excluir) e "Não é permitido excluir o próprio usuário" (excluir). Todos chegam como `kind: 'conflict'`, sem um código que os diferencie.
- `PUT /users/{id}/password` invalida todos os tokens emitidos antes, inclusive o da sessão de quem chama, se for o próprio usuário.
- No contrato, `role` é `string`, então a troca de `ADMIN`/`USER` por `COORDENADOR`/`EDUCADOR` não muda os tipos gerados.

## Goals / Non-Goals

**Goals:**
- Reaproveitar o padrão de Turmas sem abstrair cedo demais: os componentes de usuário são próprios e copiam a estrutura.
- Deixar as roles num só lugar, para que o nome e o rótulo não se espalhem pelo código.
- Não deixar a senha passar por log, URL ou estado que sobreviva ao modal.

**Non-Goals:**
- Extrair um "CRUD genérico" compartilhado entre Turmas e Usuários.
- Atualização otimista: a lista é sempre buscada de novo depois de uma mutação, como em Turmas.

## Decisions

### D1. Roles centralizadas em `validation.ts` e `user.ts`
`validation.ts` exporta `ROLES = ['COORDENADOR', 'EDUCADOR'] as const`, o tipo `Role` e `COORDINATOR_ROLE`. O `roleLabels` de `components/layout/user.ts` passa a `{ COORDENADOR: 'Coordenador(a)', EDUCADOR: 'Educador(a)' }`, e uma role desconhecida continua aparecendo como veio. `nav-items.ts` usa `roles: [COORDINATOR_ROLE]`, e `configuracoes.tsx` compara com `COORDINATOR_ROLE`.
- *Descartado*: aceitar `ADMIN` como sinônimo durante a transição. Front e back sobem juntos (proposal, Non-goals), e o sinônimo deixaria um caminho de acesso que ninguém testa.

### D2. Módulo `users.ts` no padrão de `classrooms.ts`
`integrations/educare-api/users.ts` traz `listUsers(api, { page })`, `createUser`, `updateUser`, `resetUserPassword` e `deleteUser`, com a API injetada. As funções devolvem resultados serializáveis (`{ ok: true, ... } | { ok: false } & FormError`) e relançam só o `401`. `listUsers` devolve `{ users: User[], page: { number, size, totalElements, totalPages } }`, com `User = Pick<UserResponse, 'id' | 'name' | 'login' | 'role' | 'createdAt'>`. As server functions (`getUsers`, `createUser`, `updateUser`, `resetUserPassword`, `deleteUser`) entram em `functions.ts` com o middleware `authenticated` e o `validator` com o mesmo schema Zod do formulário.
- *Descartado*: chamar `GET /users/{id}` antes de editar. A lista já traz os dados, e um `404` no `PUT` já cobre o usuário que sumiu.

### D3. Schemas Zod que espelham o backend
Em `validation.ts`:
- `userFieldsSchema` tem `name` (trim, 1–150), `login` (trim, 1–254, regex do backend com "Informe um email válido.") e `role` (`z.enum(ROLES)`).
- `createUserSchema` é `userFieldsSchema` mais `password`.
- `updateUserSchema` é `{ id: uuid }` mais `userFieldsSchema`, mais `currentRole` e `currentLogin`, usados só para classificar o `409` (D5) e não enviados à API.
- `resetPasswordSchema` é `{ id }` mais `newPassword` e `confirmPassword`.

A regra de senha (`newPasswordField`: 8–72 caracteres e até 72 bytes, com as mensagens atuais) é extraída de `changePasswordSchema` e reaproveitada, para Minha conta e Usuários não divergirem. A server function de redefinir valida de novo e envia à API só `{ password }`.
- *Descartado*: deixar o `type='email'` do navegador validar. O formulário usa `noValidate`, e a regra do navegador é diferente da do backend.

### D4. Página no endereço, via `validateSearch`
A rota `usuarios.tsx` declara `validateSearch` com `pagina` (inteiro ≥ 1, e o padrão 1 para valor ausente ou inválido, via `.catch(1)`). A query é `usersQuery(page)`, com a chave `['educare-api', 'users', page]`, `retry: false` e `placeholderData: keepPreviousData`, para a lista anterior continuar na tela enquanto a próxima página carrega (os botões de paginação ficam desabilitados durante o `isFetching`). A API recebe `page: pagina - 1`. Se a resposta vier vazia com `totalPages > 0`, a aba navega com `replace` para `pagina=totalPages`. Depois de excluir, a lista é invalidada, e a mesma regra leva à página anterior quando a atual esvazia.
- *Descartado*: página num `useState`. Ela se perderia ao recarregar e ao voltar no navegador.
- *Descartado*: `loader` com SSR da lista. Turmas busca no navegador para mostrar o skeleton e o "Tentar de novo", e a Usuários segue igual.

### D5. Classificação dos `409`
O backend não diferencia os conflitos por código, então o front decide pelo que o pedido mudou:
- criar: o `409` é sempre email → `fieldErrors.login = messages.userEmailTaken`;
- editar: se o usuário era `COORDENADOR`, passa a `EDUCADOR` e o email (normalizado em minúsculas e sem espaços) não mudou, o conflito é o último coordenador → alerta `messages.lastCoordinator`. Se a role não perdeu `COORDENADOR`, o conflito é o email → erro no campo. Se mudaram os dois, vale o `detail` da API num alerta (ele é em pt-BR e não tem dados pessoais);
- excluir: o `409` vira `messages.lastCoordinator`. A autoexclusão não chega pela interface (D7), e um `409` de outra causa mostra o `detail` da API.

A classificação fica em `users.ts`, no servidor, que recebe `currentRole` e `currentLogin` no `updateUserSchema`.
- *Descartado*: comparar o texto do `detail`. Ele quebraria com qualquer ajuste de redação no backend.
- *Descartado*: pedir um código de erro ao backend nesta entrega. Seria o mais robusto, mas fica como melhoria (Open Questions).

### D6. Editar a si mesmo(a) recarrega a sessão
Depois de um `updateUser` bem-sucedido em que `id === sessão.id`, a seção invalida `currentUserQuery` e chama `router.invalidate()`. O `beforeLoad` de `/configuracoes` roda de novo com a role nova e leva a `/` quem virou `EDUCADOR`. O aviso "Usuário atualizado." aparece antes.
- *Descartado*: atualizar o contexto à mão. O `beforeLoad` já é a fonte da regra de acesso.

### D7. Ações da própria linha
`UserActions` recebe `isSelf`. Com ele, só "Editar" aparece, e um espaçador de 2 × 44 px mantém as colunas alinhadas, como na prancha. A decisão da usuária foi esconder "Redefinir senha" na própria linha, porque a redefinição pela coordenação invalida o token da sessão atual. A própria senha se troca em Minha conta. A identificação vem de `Route.useRouteContext().user.id`.
- *Descartado*: levar a Minha conta ou desconectar depois de salvar (opções apresentadas e recusadas).

### D8. Componentes em `src/components/users/`
`users-section.tsx` (estado, query e modais, como `classrooms-section.tsx`), `user-table.tsx`, `user-list.tsx` (cards), `user-actions.tsx`, `user-form.tsx` (novo e editar, com `mode`), `reset-password-form.tsx`, `delete-user-dialog.tsx`, `role-badge.tsx`, `pagination.tsx` e `format.ts` (`userCountLabel`, `rangeLabel`). `formatCreatedAt` e `plural` saem de `classrooms/format.ts` para `src/components/format.ts`, e Turmas passa a importá-los de lá.
- *Descartado*: importar de `#/components/classrooms/format` em Usuários, o que acoplaria duas abas sem relação.

### D9. Seletor de função com o `Select` do shadcn
Usa `#/components/ui/select` com um `Label` ligado pelo `id` do trigger e a dica em `aria-describedby`. As opções seguem a ordem "Educador(a)" e depois "Coordenador(a)", e "Educador(a)" é o padrão em "Novo usuário". O selo da função (`RoleBadge`) usa `emerald-50`/`emerald-700` (escuro: `emerald-950`/`emerald-400`) para Coordenador(a) e `sage-100`/`sage-700` (escuro: `sage-800`/`sage-300`) para Educador(a), as cores da prancha.

### D10. Senha só no formulário
Os campos de senha usam `PasswordInput`, com `autoComplete='new-password'`. O valor existe só no estado do TanStack Form, que é descartado quando o modal desmonta. Nenhuma função loga o corpo, e as mensagens de erro de senha são fixas (do Zod ou do `fieldErrors.password` da API, que não ecoa o valor).

### D11. Textos fixos em `messages.ts`
Entram `userCreated` ("Usuário criado."), `userUpdated` ("Usuário atualizado."), `userPasswordReset` ("Senha redefinida. A pessoa precisa entrar de novo com a nova senha."), `userDeleted` ("Usuário excluído."), `userEmailTaken` ("Já existe um usuário com esse email."), `lastCoordinator` ("O sistema precisa ter ao menos um(a) coordenador(a).") e `userNotFound` ("Esse usuário não existe mais. A lista foi atualizada."). O `400` com `errors` por campo é mapeado de `login` para o campo "Email" e de `password` para "Senha"/"Nova senha".

## Testes

- **Unitários (Vitest)**:
  - `users.ts`: lista e conversão de página (1 → 0); `409` de criar → campo email; `409` de editar nos três casos de D5; `409` de excluir; `404` → `not-found`; `401` relançado; corpo de redefinir só com `password`.
  - `validation.ts`: limites de nome, email e senha, e senhas diferentes.
  - `format.ts`: "1 pessoa…" e "N pessoas…"; "Mostrando 21–25 de 25".
  - `user.ts`: `roleLabel` com `COORDENADOR`, `EDUCADOR` e role desconhecida.
  - `nav-items.ts`: só `COORDENADOR` vê "Configurações".
- **Testing Library** (com `src/testing/render-route.tsx` e as server functions mockadas, como em `-classrooms.test.tsx`), num novo `src/routes/-users.test.tsx`:
  - lista com o selo "Você" e sem excluir nem redefinir na própria linha; skeleton; erro com "Tentar de novo";
  - paginação (`?pagina=2`, botões desabilitados; página além da última);
  - criar (sucesso, email duplicado, validação sem envio);
  - editar (último coordenador; rebaixar a si mesma leva a `/`);
  - redefinir (senhas diferentes, sucesso);
  - excluir (sucesso, `409`, cancelar sem requisição);
  - `404` fecha e atualiza; foco devolvido; modal não fecha durante o envio.
  - Também: ajustes em `-settings.test.tsx` (`EDUCADOR` e roles antigas barrados, novo texto), `-my-account.test.tsx`, `app-header`, `app-sidebar`, `user-menu` e `-authenticated` para as roles novas.
- **Manual**: comparar com as pranchas "Usuários · lista", "novo usuário", "editar usuário", "redefinir senha", "excluir usuário", "celular" e "Minha conta · desktop", em 1440 px e 390 px, nos modos claro e escuro. Conferir com o backend novo rodando localmente: criar, editar, redefinir (a pessoa é desconectada), excluir e o último coordenador.

## Risks / Trade-offs

- [Deploy fora de sincronia com o backend] → Com só um dos dois novos, ninguém entra em Configurações. Mitigação: subir os dois juntos e checar, no ambiente, que o admin inicial aparece como "Coordenador(a)".
- [A heurística de D5 erra se o backend mudar a ordem das checagens] → No caso ambíguo, o `detail` da API é mostrado, e os testes unitários fixam os três casos. Pedir um código de erro ao backend (Open Questions).
- [Os cenários de `classrooms` e `api-client` ainda citam `ADMIN` como ator] → Os requisitos deles não dependem da role, porque o acesso é regido por `settings`. Fica como débito de redação para uma change futura, para não reescrever esses specs inteiros aqui.
- [O `schema.gen.ts` pode não mudar] → `role` já é `string`. Regenerar mesmo assim, para pegar outras mudanças do contrato.

## Migration Plan

1. Implementar com mocks; regenerar `schema.gen.ts` quando a subtarefa [Back] publicar o contrato.
2. Testar localmente contra o backend novo (`API_CONTRACT=../educare-backend/openapi/educare-api.json npm run api:generate`).
3. Fazer o deploy junto com o backend. Rollback: reverter os dois juntos (a migration V7 do back precisa do caminho inverso dela).

## Open Questions

- Vale pedir ao backend um campo `code` no `ProblemDetail` dos `409` (por exemplo, `LOGIN_IN_USE`, `LAST_COORDINATOR`) para substituir a heurística de D5? Não muda os specs nem as tarefas desta change.
