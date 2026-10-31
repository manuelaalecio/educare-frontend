# classrooms Specification

## Purpose

Permitir que um administrador cadastre, renomeie e exclua as turmas da escola pela aba Configurações › Turmas, que mostra a lista vinda da API com as contagens de alunos, no desktop e no celular.

## Requirements

### Requirement: Lista de turmas
A aba `/configuracoes/turmas` SHALL ter o título de aba do navegador "Turmas · Configurações · Educare" e mostrar uma seção com o título de nível 2 "Turmas", um subtítulo e o botão "Nova turma". O subtítulo SHALL ser "N turmas cadastradas. Elas aparecem nos gráficos do Início." com o total de turmas, ou "1 turma cadastrada. Elas aparecem nos gráficos do Início." quando houver só uma. As turmas SHALL aparecer na ordem devolvida pela API, que é a ordem alfabética do nome.

Em telas com 768 px de largura ou mais, as turmas SHALL aparecer numa tabela com o nome acessível "Turmas" e as colunas "Nome", "Alunos", "Meninos", "Meninas", "Criada em" e "Ações". "Criada em" SHALL mostrar a data de criação no formato `dd/mm/aaaa`, no fuso de São Paulo. Em telas menores, as turmas SHALL aparecer numa lista em que cada item mostra o nome e o resumo "N alunos · X meninos e Y meninas", com o singular quando o número for 1 ("1 aluno", "1 menino", "1 menina").

Cada turma, na tabela e na lista, SHALL ter os botões de ícone "Editar <nome da turma>" e "Excluir <nome da turma>", com alvo de toque de pelo menos 44 × 44 px e o botão de excluir na cor de perigo. A aba SHALL funcionar e manter contraste de pelo menos 4,5:1 nos textos nos modos claro e escuro.

#### Scenario: Turmas em ordem alfabética
- **WHEN** um `ADMIN` abre `/configuracoes/turmas` numa tela de 1440 px, e a API devolve "Turma 1" e "Turma 2", criadas em `2026-02-02T13:00:00Z`, sem alunos
- **THEN** a tabela "Turmas" mostra "Turma 1" antes de "Turma 2", cada uma com "0" em Alunos, Meninos e Meninas e "02/02/2026" em Criada em, e o subtítulo é "2 turmas cadastradas. Elas aparecem nos gráficos do Início."

#### Scenario: Uma turma só
- **WHEN** a API devolve só "Turma 1"
- **THEN** o subtítulo é "1 turma cadastrada. Elas aparecem nos gráficos do Início."

#### Scenario: Data perto da meia-noite
- **WHEN** uma turma foi criada em `2026-03-01T02:30:00Z`
- **THEN** "Criada em" mostra "28/02/2026"

#### Scenario: Lista no celular
- **WHEN** um `ADMIN` abre a aba numa tela de 390 px, e a API devolve "Turma 1" com 38 alunos, 20 meninos e 18 meninas
- **THEN** a aba mostra a lista com "Turma 1" e "38 alunos · 20 meninos e 18 meninas", com os botões "Editar Turma 1" e "Excluir Turma 1", e não mostra a tabela

#### Scenario: Singular no resumo
- **WHEN** a API devolve uma turma com 1 aluno, 1 menino e 0 meninas, numa tela de 390 px
- **THEN** o resumo é "1 aluno · 1 menino e 0 meninas"

### Requirement: Carregamento, lista vazia e erro
Enquanto a lista é buscada, a aba SHALL mostrar marcadores de carregamento no lugar das turmas, sem subtítulo de total. Sem turmas, a aba SHALL mostrar o subtítulo "Nenhuma turma cadastrada." e, no lugar da tabela ou da lista, o texto "Crie a primeira turma para usá-la nos gráficos do Início.", com o botão "Nova turma" do cabeçalho disponível. Se a busca falhar, a aba SHALL mostrar, no lugar das turmas, a mensagem de erro da integração com a API (por exemplo, "Não foi possível falar com o servidor. Tente de novo em instantes.") e o botão "Tentar de novo", que busca a lista de novo. Um `401` SHALL seguir o fluxo de sessão expirada.

#### Scenario: Lista vazia
- **WHEN** um `ADMIN` abre a aba e a API devolve uma lista vazia
- **THEN** a aba mostra "Nenhuma turma cadastrada." e "Crie a primeira turma para usá-la nos gráficos do Início.", e o botão "Nova turma" abre o modal "Nova turma"

#### Scenario: API indisponível
- **WHEN** um `ADMIN` abre a aba e a API responde `500`
- **THEN** a aba mostra "Não foi possível falar com o servidor. Tente de novo em instantes." e o botão "Tentar de novo"

#### Scenario: Tentar de novo
- **WHEN** a aba mostra o erro, a API volta a responder, e o `ADMIN` clica em "Tentar de novo"
- **THEN** a lista de turmas aparece no lugar da mensagem de erro

#### Scenario: Sem permissão na API
- **WHEN** a API responde `403` à busca da lista
- **THEN** a aba mostra "Você não tem permissão para fazer isso." e o botão "Tentar de novo"

### Requirement: Nome da turma
Nos modais "Nova turma" e "Editar turma", o campo "Nome da turma" SHALL ser validado antes do envio: o nome é gravado sem espaços nas pontas e SHALL ter de 1 a 60 caracteres depois disso. Vazio ou só com espaços SHALL mostrar "Informe o nome da turma." junto ao campo; com mais de 60 caracteres, "Use no máximo 60 caracteres.". Com erro de validação, nada SHALL ser enviado à API. O campo SHALL estar ligado à mensagem de erro por `aria-describedby` e ter `aria-invalid` enquanto houver erro. Um `409` da API ao criar ou renomear SHALL mostrar "Já existe uma turma com esse nome." junto ao campo, com o modal aberto. Um `400` com `errors` para o campo `name` SHALL mostrar a mensagem da API junto ao campo. Ao editar o campo, o erro vindo da API para ele SHALL sumir.

#### Scenario: Nome vazio
- **WHEN** o `ADMIN` deixa "Nome da turma" vazio, ou só com espaços, e clica em "Criar turma"
- **THEN** aparece "Informe o nome da turma." junto ao campo, e nenhuma requisição é feita à API

#### Scenario: Nome longo
- **WHEN** o `ADMIN` digita 61 caracteres em "Nome da turma" e clica em "Salvar alterações"
- **THEN** aparece "Use no máximo 60 caracteres." junto ao campo, e nenhuma requisição é feita à API

#### Scenario: Espaços nas pontas
- **WHEN** o `ADMIN` digita "  Turma 3 " e clica em "Criar turma"
- **THEN** a API recebe o nome "Turma 3"

#### Scenario: Nome duplicado
- **WHEN** existe "Turma 1", e o `ADMIN` tenta criar, ou renomear outra turma para, "turma 1", e a API responde `409`
- **THEN** o modal continua aberto com "Já existe uma turma com esse nome." junto ao campo, e a lista não muda

#### Scenario: Erro de campo vindo da API
- **WHEN** a API responde `400` com `{"title": "Bad Request", "status": 400, "errors": [{"field": "name", "message": "deve ter no máximo 60 caracteres"}]}`
- **THEN** "deve ter no máximo 60 caracteres" aparece junto ao campo "Nome da turma"

### Requirement: Criar turma
O botão "Nova turma" SHALL abrir o modal "Nova turma", com a descrição "A turma aparece nos gráficos do Início assim que for criada.", o campo "Nome da turma" vazio e com o placeholder "Ex.: Turma N", em que N é o total de turmas da lista mais um, e os botões "Cancelar" e "Criar turma". Ao abrir, o foco SHALL ir para o campo. Ao criar com sucesso, o modal SHALL fechar, a lista SHALL ser buscada de novo (com a turma nova e o subtítulo atualizado) e SHALL aparecer o aviso "Turma criada.".

#### Scenario: Criar turma
- **WHEN** existem 2 turmas, e o `ADMIN` clica em "Nova turma", digita "  Turma 3 " e clica em "Criar turma"
- **THEN** o modal fecha, a lista mostra "Turma 3", o subtítulo passa a "3 turmas cadastradas. Elas aparecem nos gráficos do Início." e aparece "Turma criada."

#### Scenario: Abrir o modal
- **WHEN** existem 2 turmas, e o `ADMIN` clica em "Nova turma"
- **THEN** abre o modal "Nova turma" com o foco no campo "Nome da turma", que tem o placeholder "Ex.: Turma 3"

### Requirement: Renomear turma
O botão "Editar <nome da turma>" SHALL abrir o modal "Editar turma", com a descrição "Mudar o nome não tira nenhum aluno da turma.", o campo "Nome da turma" preenchido com o nome atual, o texto "N alunos nesta turma" (ou "1 aluno nesta turma") abaixo do campo e os botões "Cancelar" e "Salvar alterações". Ao abrir, o foco SHALL ir para o campo. Ao salvar com sucesso, o modal SHALL fechar, a lista SHALL ser buscada de novo e SHALL aparecer o aviso "Turma renomeada.". A data "Criada em" SHALL continuar a que a API devolve.

#### Scenario: Renomear
- **WHEN** o `ADMIN` clica em "Editar Turma 1", troca o nome para "Maternal A" e clica em "Salvar alterações"
- **THEN** o modal fecha, a lista mostra "Maternal A" no lugar de "Turma 1" com a mesma data em "Criada em", e aparece "Turma renomeada."

#### Scenario: Modal de edição
- **WHEN** o `ADMIN` clica em "Editar Turma 1", que tem 38 alunos
- **THEN** abre o modal "Editar turma" com "Turma 1" no campo e "38 alunos nesta turma"

### Requirement: Excluir turma
O botão "Excluir <nome da turma>" SHALL abrir um modal de confirmação com o título "Excluir <nome da turma>?", a descrição "A turma sai da lista e dos gráficos do Início. Só dá para excluir turmas sem alunos.", o alerta "Essa ação não pode ser desfeita." e os botões "Cancelar" e "Excluir turma", este na cor de perigo. Ao abrir, o foco SHALL ir para "Cancelar". Nada SHALL ser enviado à API antes de "Excluir turma". Ao excluir com sucesso, o modal SHALL fechar, a lista SHALL ser buscada de novo e SHALL aparecer o aviso "Turma excluída.". Se a API responder `409`, o modal SHALL continuar aberto com o alerta "Esta turma tem alunos. Tire os alunos da turma antes de excluí-la.".

#### Scenario: Excluir
- **WHEN** o `ADMIN` clica em "Excluir Turma 3" e depois em "Excluir turma"
- **THEN** o modal fecha, "Turma 3" sai da lista, e aparece "Turma excluída."

#### Scenario: Cancelar a exclusão
- **WHEN** o `ADMIN` clica em "Excluir Turma 3" e depois em "Cancelar"
- **THEN** o modal fecha, nenhuma requisição de exclusão é feita, e "Turma 3" continua na lista

#### Scenario: Turma com alunos
- **WHEN** o `ADMIN` confirma a exclusão de "Turma 1" e a API responde `409`
- **THEN** o modal continua aberto com "Esta turma tem alunos. Tire os alunos da turma antes de excluí-la.", e "Turma 1" continua na lista

### Requirement: Comportamento comum dos modais de turma
Os modais de turma SHALL prender o foco enquanto abertos e fechar com "Cancelar", com `Esc` ou com um clique fora, devolvendo o foco ao botão que os abriu (ou, se a turma saiu da lista, ao botão "Nova turma"). Fechar SHALL descartar o que foi digitado e os erros. Durante o envio, os botões do modal SHALL ficar desabilitados e o modal SHALL NOT fechar por `Esc` nem por clique fora. Se a API responder `404` ao renomear ou excluir, o modal SHALL fechar, a lista SHALL ser buscada de novo e SHALL aparecer o aviso "Essa turma não existe mais. A lista foi atualizada.". Outros erros (`403`, `5xx`, falha de rede, `400` sem erro de campo) SHALL aparecer num alerta dentro do modal, com a mensagem da integração com a API, com o modal aberto. Um `401` SHALL seguir o fluxo de sessão expirada.

#### Scenario: Turma excluída por outra pessoa
- **WHEN** o `ADMIN` tenta renomear "Turma 2", que outro administrador já excluiu, e a API responde `404`
- **THEN** o modal fecha, a lista é buscada de novo sem "Turma 2", e aparece "Essa turma não existe mais. A lista foi atualizada."

#### Scenario: Envio em andamento
- **WHEN** o `ADMIN` clica em "Criar turma" e a API ainda não respondeu
- **THEN** "Cancelar" e "Criar turma" ficam desabilitados, e apertar `Esc` não fecha o modal

#### Scenario: Cancelar descarta
- **WHEN** o `ADMIN` abre "Nova turma", digita "Turma 9", aperta `Esc` e abre "Nova turma" de novo
- **THEN** o campo está vazio, e o foco voltou ao botão "Nova turma" ao fechar

#### Scenario: Servidor indisponível ao salvar
- **WHEN** o `ADMIN` clica em "Salvar alterações" e a API não responde em 10 segundos
- **THEN** o modal continua aberto com o alerta "Não foi possível falar com o servidor. Tente de novo em instantes."
