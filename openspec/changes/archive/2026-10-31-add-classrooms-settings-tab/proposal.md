# Proposal

## Why

A escola organiza os alunos em turmas, e os gráficos do Início ("Alunos por turma") e a futura matrícula dependem delas, mas hoje não há onde cadastrá-las: `/configuracoes` ainda é a página "em construção". A tarefa [CRUD de turmas em Configurações](https://app.clickup.com/t/1dfh60ph06m) cria o cadastro no back e no front; esta change cobre só a parte do front, a subtarefa [Aba Turmas em Configurações](https://app.clickup.com/t/1dfh60ph072), consumindo a API `/api/v1/classrooms` que a subtarefa de back vai publicar.

## What Changes

- `/configuracoes` deixa de ser página provisória e vira um layout só para `ADMIN`: título "Configurações", subtítulo "Usuários do sistema e turmas da escola. Só administradores acessam esta área." e as abas "Usuários" e "Turmas" (navegação "Seções das configurações"), cada uma com rota própria. Um `USER` que abre qualquer endereço de `/configuracoes` é levado ao Início.
- `/configuracoes` redireciona para a primeira aba, `/configuracoes/usuarios`, que fica provisória até a tarefa dela.
- Nova aba `/configuracoes/turmas` (título de aba "Turmas · Configurações · Educare"):
  - cabeçalho "Turmas", subtítulo "N turmas cadastradas. Elas aparecem nos gráficos do Início." (singular para 1) e botão "Nova turma";
  - desktop: tabela com Nome, Alunos, Meninos, Meninas, Criada em (dd/mm/aaaa) e Ações (editar e excluir, com os nomes "Editar <turma>" e "Excluir <turma>");
  - celular: lista com o nome e "N alunos · X meninos e Y meninas", e os mesmos botões;
  - modais "Nova turma" (campo "Nome da turma", botão "Criar turma"), "Editar turma" (nome preenchido, "N alunos nesta turma", botão "Salvar alterações") e "Excluir <turma>?" (aviso "Essa ação não pode ser desfeita." e botão de perigo "Excluir turma");
  - estados de carregando (skeleton), vazio (com "Nova turma"), erro (com "Tentar de novo"), enviando (botões desabilitados), erro no campo (`400` e nome duplicado `409`), turma com alunos (`409` na exclusão) e turma que não existe mais (`404`: a lista é recarregada e aparece um aviso);
  - a lista é recarregada depois de criar, renomear ou excluir.
- Validação do nome no front igual à da API: obrigatório, sem espaços nas pontas, de 1 a 60 caracteres. Um nome inválido não chega a ser enviado.
- Novas server functions de turmas (listar, criar, renomear, excluir) com o cliente de `#/integrations/educare-api`, sempre com o token da sessão, e uma query do TanStack Query para a lista.
- Novo componente `Table` do shadcn em `src/components/ui/table.tsx`.

## Non-goals

- O módulo de turmas na API, a migration e as regras do servidor (nome único sem diferenciar maiúsculas e acentos, `403` para quem não é `ADMIN`, recusar exclusão de turma com alunos): ficam na subtarefa [API de turmas (/api/v1/classrooms)](https://app.clickup.com/t/1dfh60ph071). O front só mostra o que a API responde.
- Contagens reais de alunos, meninos e meninas: vêm da API e serão 0 até existir a matrícula.
- O conteúdo da aba Usuários (tarefa própria).
- A página `/turmas` do menu principal, que continua "em construção".
- Ano letivo, turno, faixa etária, capacidade, professor, busca, paginação e ordenação pela interface.
- Mudar os gráficos do Início para usar as turmas da API.

## Capabilities

### New Capabilities

- `settings`: a área Configurações, com o acesso só para `ADMIN`, o cabeçalho, as abas "Usuários" e "Turmas" com rota própria, o redirect de `/configuracoes` e a aba Usuários provisória.
- `classrooms`: a aba Configurações › Turmas, com a lista (tabela e celular), os modais de criar, renomear e excluir, a validação do nome e os estados de carregamento, vazio, erro e envio.

### Modified Capabilities

- `app-layout`: `/configuracoes` sai do requisito "Páginas provisórias das áreas"; o título "Configurações" do cabeçalho e o destaque do item "Configurações" passam a valer também nas abas (`/configuracoes/turmas`).

## Impact

- **Código**: `src/routes/_authenticated/configuracoes.tsx` (vira layout com `beforeLoad` de role e `Outlet`), novos `configuracoes/index.tsx` (redirect), `configuracoes/usuarios.tsx` e `configuracoes/turmas.tsx`; novos componentes em `src/components/classrooms/` (tabela, lista do celular, modal do formulário, modal de exclusão, formatação); `src/integrations/educare-api/` (`classrooms.ts` com a lógica, `functions.ts`, `queries.ts`, `validation.ts`, `messages.ts`); `src/components/ui/table.tsx` (shadcn); `src/routes/-under-construction.test.tsx` e `src/testing/render-route.tsx`.
- **API**: depende de `GET`, `POST`, `PUT` e `DELETE` em `/api/v1/classrooms` no contrato OpenAPI do backend e da regeneração de `schema.gen.ts` com `npm run api:generate`. O contrato publicado hoje não tem turmas.
- **Ordem e sobreposição**: não há outra change em andamento neste repositório. No `educare-backend`, a subtarefa de back ainda não tem change; a `add-child-crud`, em andamento lá, cria a extensão `unaccent` que a regra de nome único de turmas usa, mas não toca no front. Esta change só pode terminar depois que o contrato de turmas estiver publicado (ou disponível no back local, via `API_CONTRACT`): os tipos gerados são a fonte dos campos usados aqui. Até lá, dá para fazer o layout de Configurações, a validação e os componentes com dados de teste. A futura change da aba Usuários vai substituir o conteúdo de `configuracoes/usuarios.tsx` e reusar o layout e os padrões de modal daqui.
- **Dependências**: nenhuma nova no `package.json` (o `Table` do shadcn é só marcação com Tailwind).
