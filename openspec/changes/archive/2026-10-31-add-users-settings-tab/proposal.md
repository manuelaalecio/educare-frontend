# Proposal

## Why

A API já tem o CRUD de usuários (`/api/v1/users`), mas a aba Configurações › Usuários ainda é uma página provisória ("Esta seção ainda está em construção."), e a coordenação não tem como cadastrar a equipe sem chamar a API. Além disso, os perfis `ADMIN`/`USER` (exibidos como "Administrador"/"Funcionário") não refletem como a escola se organiza. O backend vai trocá-los por `COORDENADOR`/`EDUCADOR` (subtarefa [Back] da tarefa [Aba Usuários em Configurações com funções Coordenador(a) e Educador(a)](https://app.clickup.com/t/1dfh60ph0nd)), e o front precisa acompanhar no mesmo deploy. Esta change cobre a subtarefa [Front] ([Aba Usuários em Configurações](https://app.clickup.com/t/1dfh60ph0nf)).

## What Changes

- A aba `/configuracoes/usuarios` deixa de ser provisória e passa a ter:
  - a lista paginada de usuários: avatar com as iniciais, nome, selo "Você" na própria linha, email, função, data de criação e ações, com "Mostrando X–Y de Z" e os botões "Anterior" e "Próxima". A página atual fica no endereço (`?pagina=N`);
  - tabela a partir de 768 px e cards abaixo disso;
  - o modal "Novo usuário" (nome, email, senha inicial e função, com Educador(a) como padrão);
  - o modal "Editar usuário" (nome, email e função preenchidos, sem senha);
  - o modal "Redefinir senha" (nova senha e confirmação);
  - o modal de exclusão "Excluir <nome>?", com a confirmação "Essa ação não pode ser desfeita.".
- Na própria linha não aparecem "Excluir" nem "Redefinir senha". A própria senha continua sendo trocada em Minha conta, porque a redefinição pela coordenação desconectaria a sessão atual.
- Tratamento dos erros da API nos modais: email já usado (`409`) aparece no campo "Email"; "O sistema precisa ter ao menos um(a) coordenador(a)." aparece ao rebaixar ou excluir o último coordenador; `404` fecha o modal e atualiza a lista.
- Ao editar a si mesmo(a), a sessão é recarregada. Quem se rebaixa a Educador(a) sai de Configurações.
- **BREAKING**: as roles passam a ser `COORDENADOR` e `EDUCADOR`. Só `COORDENADOR` vê o item "Configurações" e entra em `/configuracoes/*`. `ADMIN` e `USER` deixam de ser reconhecidos (aparecem como vieram e não entram em Configurações).
- Rótulos: "Coordenador(a)" e "Educador(a)" no lugar de "Administrador" e "Funcionário" no menu do usuário, em Minha conta e na aba. O cabeçalho de Configurações passa a dizer "Só coordenadores(as) acessam esta área.", e Minha conta passa a dizer "Nome, email e função são alterados por um(a) coordenador(a), em Configurações.".
- Novo módulo `integrations/educare-api/users.ts` com as server functions de listar, criar, editar, redefinir senha e excluir, e `schema.gen.ts` regenerado do contrato novo do backend.

## Non-goals

- Busca e filtro na lista de usuários.
- Funções além de Coordenador(a) e Educador(a), e permissões próprias de educador(a) (por exemplo, ver só as próprias turmas). Educador(a) tem exatamente o acesso que `USER` tem hoje.
- Convite por email e troca obrigatória de senha no primeiro acesso.
- Escolher a ordenação ou o tamanho da página: a lista usa o padrão da API (20 por página, por nome).
- Compatibilidade com o backend antigo (`ADMIN`/`USER`): front e back sobem juntos.
- Mudar o backend: isso é a subtarefa [Back].

## Capabilities

### New Capabilities
- `users`: a aba Configurações › Usuários, com a lista paginada, os modais de novo usuário, editar, redefinir senha e excluir, os estados de carregamento e erro e a versão para celular.

### Modified Capabilities
- `settings`: acesso só para `COORDENADOR` (em vez de `ADMIN`), novo texto do cabeçalho, e o requisito "Aba Usuários provisória" é removido.
- `app-layout`: o link "Configurações" aparece só para `COORDENADOR`, e o menu do usuário mostra "Coordenador(a)" ou "Educador(a)".
- `auth`: o cabeçalho e a página Minha conta mostram a função como "Coordenador(a)" ou "Educador(a)", com o novo texto do rodapé do card de perfil.

## Impact

- **Código**: `src/routes/_authenticated/configuracoes/usuarios.tsx` (substitui a página provisória), `src/routes/_authenticated/configuracoes.tsx` (checagem de role e texto), novo `src/components/users/*`, novo `src/integrations/educare-api/users.ts` e mudanças em `functions.ts`, `queries.ts`, `validation.ts` e `messages.ts`, `src/components/layout/user.ts` (`roleLabel`), `src/components/layout/nav-items.ts`, `src/routes/_authenticated/minha-conta/index.tsx`, e os testes que usam `ADMIN`/`USER`.
- **API**: usa `GET/POST /api/v1/users`, `PUT/DELETE /api/v1/users/{id}` e `PUT /api/v1/users/{id}/password`, já existentes. Depende do contrato novo da subtarefa [Back] (roles `COORDENADOR|EDUCADOR` e a mensagem de "último coordenador"). `schema.gen.ts` é regenerado com `npm run api:generate` depois que o contrato for publicado.
- **Ordem e sobreposição**: não há outra change em andamento neste repositório (`openspec list` vazio). Ela vem depois de `add-classrooms-settings-tab` (já arquivada), cujos componentes reaproveita. No backend, a subtarefa [Back] precisa subir no mesmo deploy: com só o back novo, o front atual esconde Configurações de todo mundo; com só o front novo, ninguém entra em Configurações. As changes em andamento do backend (`add-child-crud`, `migrate-deploy-to-gitops`) não mexem em usuários.
- **Dependências**: nenhuma nova. O `select` do shadcn já existe.
- **LGPD**: senhas só passam pelo servidor do front até a API. Não aparecem em log, URL nem mensagem de erro.
