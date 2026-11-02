# Spec Delta

## MODIFIED Requirements

### Requirement: Lista de turmas
A aba `/configuracoes/turmas` SHALL ter o título de aba do navegador "Turmas · Configurações · Educare" e mostrar uma seção com o título de nível 2 "Turmas", um subtítulo e o botão "Nova turma". O subtítulo SHALL ser "N turmas cadastradas. Elas aparecem nos gráficos do Início." com o total de turmas, ou "1 turma cadastrada. Elas aparecem nos gráficos do Início." quando houver só uma. As turmas SHALL aparecer na ordem devolvida pela API, que é a ordem alfabética do nome.

Em telas com 768 px de largura ou mais, as turmas SHALL aparecer numa tabela com o nome acessível "Turmas" e as colunas "Nome", "Crianças", "Meninos", "Meninas", "Criada em" e "Ações". "Criada em" SHALL mostrar a data de criação no formato `dd/mm/aaaa`, no fuso de São Paulo. Em telas menores, as turmas SHALL aparecer numa lista em que cada item mostra o nome e o resumo "N crianças · X meninos e Y meninas", com o singular quando o número for 1 ("1 criança", "1 menino", "1 menina"). Nenhum texto da aba SHALL usar "aluno" ou "alunos".

Cada turma, na tabela e na lista, SHALL ter os botões de ícone "Editar <nome da turma>" e "Excluir <nome da turma>", com alvo de toque de pelo menos 44 × 44 px e o botão de excluir na cor de perigo. A aba SHALL funcionar e manter contraste de pelo menos 4,5:1 nos textos nos modos claro e escuro.

#### Scenario: Turmas em ordem alfabética
- **WHEN** um `COORDENADOR` abre `/configuracoes/turmas` numa tela de 1440 px, e a API devolve "Turma 1" e "Turma 2", criadas em `2026-02-02T13:00:00Z`, sem crianças
- **THEN** a tabela "Turmas" mostra "Turma 1" antes de "Turma 2", cada uma com "0" em Crianças, Meninos e Meninas e "02/02/2026" em Criada em, e o subtítulo é "2 turmas cadastradas. Elas aparecem nos gráficos do Início."

#### Scenario: Uma turma só
- **WHEN** a API devolve só "Turma 1"
- **THEN** o subtítulo é "1 turma cadastrada. Elas aparecem nos gráficos do Início."

#### Scenario: Data perto da meia-noite
- **WHEN** uma turma foi criada em `2026-03-01T02:30:00Z`
- **THEN** "Criada em" mostra "28/02/2026"

#### Scenario: Lista no celular
- **WHEN** um `COORDENADOR` abre a aba numa tela de 390 px, e a API devolve "Turma 1" com 38 crianças, 20 meninos e 18 meninas
- **THEN** a aba mostra a lista com "Turma 1" e "38 crianças · 20 meninos e 18 meninas", com os botões "Editar Turma 1" e "Excluir Turma 1", e não mostra a tabela

#### Scenario: Singular no resumo
- **WHEN** a API devolve uma turma com 1 criança, 1 menino e 0 meninas, numa tela de 390 px
- **THEN** o resumo é "1 criança · 1 menino e 0 meninas"

### Requirement: Renomear turma
O botão "Editar <nome da turma>" SHALL abrir o modal "Editar turma", com a descrição "Mudar o nome não tira nenhuma criança da turma.", o campo "Nome da turma" preenchido com o nome atual, o texto "N crianças nesta turma" (ou "1 criança nesta turma") abaixo do campo e os botões "Cancelar" e "Salvar alterações". Ao abrir, o foco SHALL ir para o campo. Ao salvar com sucesso, o modal SHALL fechar, a lista SHALL ser buscada de novo e SHALL aparecer o aviso "Turma renomeada.". A data "Criada em" SHALL continuar a que a API devolve.

#### Scenario: Renomear
- **WHEN** o `COORDENADOR` clica em "Editar Turma 1", troca o nome para "Maternal A" e clica em "Salvar alterações"
- **THEN** o modal fecha, a lista mostra "Maternal A" no lugar de "Turma 1" com a mesma data em "Criada em", e aparece "Turma renomeada."

#### Scenario: Modal de edição
- **WHEN** o `COORDENADOR` clica em "Editar Turma 1", que tem 38 crianças
- **THEN** abre o modal "Editar turma" com "Turma 1" no campo, "38 crianças nesta turma" e a descrição "Mudar o nome não tira nenhuma criança da turma."

#### Scenario: Singular no modal
- **WHEN** o `COORDENADOR` clica em "Editar Turma 2", que tem 1 criança
- **THEN** o modal mostra "1 criança nesta turma"

### Requirement: Excluir turma
O botão "Excluir <nome da turma>" SHALL abrir um modal de confirmação com o título "Excluir <nome da turma>?", a descrição "A turma sai da lista e dos gráficos do Início. Só dá para excluir turmas sem crianças.", o alerta "Essa ação não pode ser desfeita." e os botões "Cancelar" e "Excluir turma", este na cor de perigo. Ao abrir, o foco SHALL ir para "Cancelar". Nada SHALL ser enviado à API antes de "Excluir turma". Ao excluir com sucesso, o modal SHALL fechar, a lista SHALL ser buscada de novo e SHALL aparecer o aviso "Turma excluída.".

Se a API responder `409`, o modal SHALL continuar aberto, a lista SHALL NOT mudar, e o alerta SHALL dizer o motivo:
- turma que tem crianças agora: "Esta turma tem crianças. Tire as crianças da turma antes de excluí-la.";
- turma sem crianças agora, mas que já teve (só histórico): "Esta turma já teve crianças e fica no histórico delas. Por isso, não pode ser excluída.".

Um `409` que não se encaixa em nenhum dos dois casos SHALL mostrar a primeira mensagem.

#### Scenario: Excluir
- **WHEN** o `COORDENADOR` clica em "Excluir Turma 3" e depois em "Excluir turma"
- **THEN** o modal fecha, "Turma 3" sai da lista, e aparece "Turma excluída."

#### Scenario: Cancelar a exclusão
- **WHEN** o `COORDENADOR` clica em "Excluir Turma 3" e depois em "Cancelar"
- **THEN** o modal fecha, nenhuma requisição de exclusão é feita, e "Turma 3" continua na lista

#### Scenario: Turma com alunos
- **WHEN** o `COORDENADOR` confirma a exclusão de "Turma 1", que tem crianças, e a API responde `409` de turma com crianças
- **THEN** o modal continua aberto com "Esta turma tem crianças. Tire as crianças da turma antes de excluí-la.", e "Turma 1" continua na lista

#### Scenario: Turma com histórico de crianças
- **WHEN** o `COORDENADOR` confirma a exclusão de "Turma 4", que não tem crianças agora mas já teve, e a API responde `409` de turma com histórico
- **THEN** o modal continua aberto com "Esta turma já teve crianças e fica no histórico delas. Por isso, não pode ser excluída.", e "Turma 4" continua na lista
