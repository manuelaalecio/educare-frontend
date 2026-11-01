# Proposal

## Why

O cadastro das crianças atendidas é o centro do Educare (responsáveis, matrícula e rematrícula dependem dele), mas o front ainda mostra "Alunos" como página em construção, e as turmas mostram sempre 0 alunos. Com a API de crianças e o vínculo criança–turma chegando no back ([Cadastro de crianças vinculadas a uma turma](https://app.clickup.com/t/1dfh60pgyy1)), o front precisa das telas para cadastrar cada criança já numa turma, encontrá-la por nome ou turma e ver todos os dados dela numa página.

## What Changes

- **"Alunos" vira "Crianças"** em todo o front ([subtarefa](https://app.clickup.com/t/1dfh60ph1z3)):
  - item do menu "Crianças", apontando para `/criancas`; a rota `/alunos` deixa de existir (**BREAKING** para quem tiver o endereço salvo);
  - Configurações › Turmas: coluna "Crianças", resumo "N crianças · X meninos e Y meninas", "N crianças nesta turma" e os textos dos modais;
  - mensagem do `409` ao excluir turma com crianças e nova mensagem para turma que só tem histórico de crianças.
- **Listagem** em `/criancas` ([subtarefa](https://app.clickup.com/t/1dfh60ph1z4)): busca por nome e filtro por turma refletidos na URL (`?nome=&turma=&pagina=`), tabela no desktop e cartões no celular, 20 por página, "Atualizado há X min" com "Atualizar", estados de carregando, vazio, vazio com filtro e erro. A única ação da lista é abrir os detalhes.
- **Cadastro e edição** em `/criancas/nova` e `/criancas/$childId/editar` ([subtarefa](https://app.clickup.com/t/1dfh60ph1z5)): formulário em seções (Turma, Dados pessoais, Documentos com a certidão de nascimento no modelo novo ou antigo, Endereço, Religião, Saúde), máscaras, validação antes do envio, erros `400`/`409` nos campos, aviso de troca de turma e confirmação ao sair com alterações não salvas.
- **Detalhes e exclusão** em `/criancas/$childId` ([subtarefa](https://app.clickup.com/t/1dfh60ph1z6)): todos os dados em cartões, CPF, RG e matrícula mascarados com "Mostrar", histórico de turmas, "Editar" para todos e "Excluir" (com modal de confirmação) só para `COORDENADOR`; 404 com "Criança não encontrada".
- **Padrão novo de dados**, mínimo para as telas de crianças: fábrica de chaves `keys` (com `keys.children` como raiz), `MutationCache` global que invalida as chaves declaradas em `mutation.meta.invalidates` só no sucesso, `ApiFieldError` lançado pela mutation, consultas com `staleTime` e carregamento no `loader` da rota (SSR). Cadastrar, editar ou excluir atualiza a lista, os detalhes e as contagens das turmas sem F5.
- Regenerar `schema.gen.ts` com o contrato novo de `/api/v1/children` e `/api/v1/children/{id}/classrooms`.

## Non-goals

- Qualquer mudança no back (API de crianças, vínculo com turma, certidão, contagens reais): ficam nas subtarefas [Back] da tarefa.
- Migrar Configurações › Turmas e Usuários para `useMutation` com `meta.invalidates`, e o "Atualizado há X min" nessas listas: ficam na tarefa [Cache de consultas com invalidação por chave](https://app.clickup.com/t/1dfh60ph1zz). Esta change só cria a base que ela vai reaproveitar.
- Responsáveis, matrícula/rematrícula, arquivo ou foto da certidão e demais anexos.
- Escolher a data da troca de turma (é sempre hoje, no servidor), busca de CEP, validação do RG por estado.
- Renomear identificadores no código e no contrato (`studentCount`, `studentSummary`, `classroomHasStudents`...).
- Editar ou excluir a partir da lista, exportar, ordenar por coluna, filtros além de nome e turma, ficha em PDF.
- Restringir a lista às crianças da turma do educador (pergunta em aberto na tarefa).
- Persistir dados de crianças no navegador.

## Capabilities

### New Capabilities
- `children`: páginas de crianças — listagem com busca e filtro por turma, cadastro, edição com troca de turma, detalhes com histórico de turmas e exclusão, incluindo a certidão de nascimento nos dois modelos, as regras de permissão e a atualização dos dados sem F5.

### Modified Capabilities
- `app-layout`: o item "Alunos" (`/alunos`) da barra lateral, do cabeçalho e da gaveta do celular vira "Crianças" (`/criancas`); `/alunos` sai das páginas provisórias.
- `classrooms`: textos "aluno(s)" viram "criança(s)" na tabela, nos cartões e nos modais; o `409` ao excluir passa a distinguir turma com crianças e turma com histórico de crianças.

## Impact

- **Ordem e sobreposição com outras changes**:
  - não há outra change em andamento no front (`openspec/changes/` só tem `archive/`);
  - depende das subtarefas [Back] "API de crianças" (change `add-child-crud` no `educare-backend`, ainda sem o vínculo e a certidão) e "Vínculo obrigatório criança–turma com histórico". O contrato com `classroomId`, `classroom`, a certidão e `/children/{id}/classrooms` precisa estar publicado antes das tarefas de integração; a troca "Alunos" → "Crianças" e a base de cache não dependem dele e podem ser feitas antes;
  - sobrepõe-se à tarefa [Cache de consultas com invalidação por chave](https://app.clickup.com/t/1dfh60ph1zz): esta change cria `keys`, o `MutationCache` e o `ApiFieldError`; a change daquela tarefa, quando vier, migra Turmas e Usuários para eles em vez de recriá-los.
- **Código**:
  - `src/integrations/educare-api/`: `queries.ts` (fábrica `keys`, consultas de crianças, `staleTime` das turmas), `children.ts` (novo), `functions.ts`, `validation.ts`, `messages.ts`, `errors.ts` (`ApiFieldError`), `classrooms.ts` (409 com histórico), `schema.gen.ts` (regenerado);
  - `src/integrations/tanstack-query/root-provider.tsx`: `MutationCache` global;
  - `src/routes/_authenticated/`: remove `alunos.tsx`, cria `criancas/` (lista, nova, detalhes, editar);
  - `src/components/children/` (novo), `src/components/classrooms/` (textos), `src/components/layout/nav-items.ts`;
  - testes em `src/routes/` e `src/components/` que citam "Alunos" ou `/alunos`.
- **Dependências de bibliotecas**: nenhuma nova (TanStack Form, Query, Router e Zod já estão no projeto); componentes do shadcn que faltarem (ex.: `badge`, `alert-dialog`) entram com `npx shadcn@latest add`.
- **LGPD**: a lista guarda só o resumo; saúde, documentos e certidão só na consulta por id e nunca na chave da lista; nada de dados da criança em logs, mensagens de erro ou armazenamento do navegador.
- **Infra**: nenhuma variável de ambiente nova.
