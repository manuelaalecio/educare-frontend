# Spec Delta

## Purpose

Dar aos funcionários da escola as páginas de crianças: encontrar uma criança por nome ou turma, cadastrá-la já numa turma, ver e alterar todos os dados dela (inclusive a certidão de nascimento e a troca de turma, que fica no histórico) e, para coordenadores(as), excluí-la, sempre com os dados atualizados sem recarregar a página e protegendo os dados pessoais das crianças (LGPD).

## ADDED Requirements

### Requirement: Lista de crianças
A página protegida `/criancas` SHALL ter o título de aba "Crianças · Educare", o título de nível 1 "Crianças", um subtítulo com o total e o botão "Nova criança", que leva a `/criancas/nova`. O subtítulo SHALL ser "N crianças cadastradas" ("1 criança cadastrada" quando for uma) sem filtro, e "N crianças encontradas" ("1 criança encontrada") com busca ou filtro de turma. As crianças SHALL aparecer em ordem alfabética do nome.

Em telas com 768 px ou mais, as crianças SHALL aparecer numa tabela com o nome acessível "Crianças" e as colunas "Nome", "Idade", "Nascimento", "Turma" e "Ações". O nome SHALL ser um link para os detalhes da criança, e a coluna "Ações" SHALL ter um único botão de ícone, com o nome acessível "Ver <nome>", que também leva aos detalhes. Em telas menores, as crianças SHALL aparecer como cartões com o nome, a idade e a turma, e o cartão inteiro SHALL ser o link para os detalhes, com alvo de toque de pelo menos 44 px de altura.

A lista SHALL NOT ter botões ou atalhos para editar ou excluir uma criança, para nenhuma role.

A idade SHALL ser contada em anos completos na data de hoje no fuso de São Paulo ("1 ano", "4 anos"); abaixo de 1 ano, em meses completos ("0 meses", "1 mês", "8 meses"). "Nascimento" SHALL estar no formato `dd/mm/aaaa`.

A página SHALL funcionar e manter contraste de pelo menos 4,5:1 nos textos nos modos claro e escuro.

#### Scenario: Lista no desktop
- **WHEN** uma `EDUCADOR` abre `/criancas` numa tela de 1440 px em 01/11/2026, e a API devolve "Ana Lima", nascida em 10/03/2022, na "Turma 1", e "Bruno Reis", nascido em 01/02/2026, na "Turma 2"
- **THEN** a tabela "Crianças" mostra "Ana Lima" com "4 anos", "10/03/2022" e "Turma 1", depois "Bruno Reis" com "8 meses", "01/02/2026" e "Turma 2", e o subtítulo é "2 crianças cadastradas"

#### Scenario: Só "Ver detalhes" na lista
- **WHEN** um `COORDENADOR` abre `/criancas` numa tela de 1440 px
- **THEN** cada linha tem só o botão "Ver <nome>", e a página não tem nenhum botão ou link "Editar" nem "Excluir"

#### Scenario: Abrir os detalhes pelo nome
- **WHEN** a usuária clica em "Ana Lima" na tabela
- **THEN** ela é levada a `/criancas/<id da Ana>` sem recarregar a página inteira

#### Scenario: Cartões no celular
- **WHEN** a usuária abre `/criancas` numa tela de 390 px
- **THEN** a página mostra os cartões com nome, idade e turma, não mostra a tabela, e tocar num cartão abre os detalhes da criança

### Requirement: Busca por nome e filtro por turma
A lista SHALL ter o campo de busca "Buscar por nome" e o seletor "Turma", com a opção "Todas as turmas" seguida das turmas cadastradas em ordem alfabética. A busca SHALL encontrar o trecho em qualquer parte do nome, sem diferenciar maiúsculas, minúsculas e acentos. A busca e o filtro SHALL ser combinados e SHALL ficar no endereço da página como `?nome=<texto>&turma=<id da turma>`, de forma que recarregar, voltar ou compartilhar o endereço mantenha a lista filtrada. A lista SHALL ser buscada de novo 300 ms depois que a usuária para de digitar, e não a cada tecla. Mudar a busca ou a turma SHALL voltar à página 1. Valores inválidos no endereço (turma que não é um id válido, página que não é um número inteiro a partir de 1) SHALL ser ignorados, como se não estivessem lá.

#### Scenario: Buscar e filtrar
- **WHEN** existem "João Pedro" e "Joana Dias" na "Turma 1" e "João Vitor" na "Turma 2", e a usuária digita "joao" e escolhe "Turma 1"
- **THEN** a lista mostra só "João Pedro", o subtítulo é "1 criança encontrada", e o endereço fica `/criancas?nome=joao&turma=<id da Turma 1>`

#### Scenario: Recarregar mantém os filtros
- **WHEN** a usuária recarrega `/criancas?nome=joao&turma=<id da Turma 1>`
- **THEN** a busca mostra "joao", o seletor mostra "Turma 1", e a lista vem filtrada

#### Scenario: Digitação sem uma requisição por tecla
- **WHEN** a usuária digita "joao" rapidamente no campo de busca
- **THEN** a lista é buscada uma só vez com "joao", 300 ms depois da última tecla

#### Scenario: Endereço inválido
- **WHEN** a usuária abre `/criancas?turma=abc&pagina=-2`
- **THEN** a lista mostra todas as turmas a partir da página 1, e o seletor mostra "Todas as turmas"

### Requirement: Paginação da lista de crianças
A lista SHALL mostrar 20 crianças por página, com o texto "Mostrando A–B de N" e os botões "Anterior" e "Próxima", desabilitados na primeira e na última página e enquanto a próxima página carrega. A página atual SHALL ficar no endereço como `?pagina=N` (a partir de 1; a página 1 não aparece no endereço). Enquanto outra página ou outro filtro carrega, a lista anterior SHALL continuar na tela. Uma página além da última SHALL levar à última página.

#### Scenario: Ir para a próxima página
- **WHEN** existem 45 crianças e a usuária clica em "Próxima" na página 1
- **THEN** o endereço passa a `/criancas?pagina=2`, e a lista mostra "Mostrando 21–40 de 45"

#### Scenario: Última página
- **WHEN** a usuária abre `/criancas?pagina=3` com 45 crianças
- **THEN** a lista mostra "Mostrando 41–45 de 45", e "Próxima" fica desabilitado

#### Scenario: Página além da última
- **WHEN** a usuária abre `/criancas?pagina=9` com 45 crianças
- **THEN** ela é levada a `/criancas?pagina=3`

### Requirement: Estados e atualização da lista de crianças
Na primeira carga feita no navegador, a lista SHALL mostrar marcadores de carregamento no lugar das crianças. Sem nenhuma criança cadastrada (e sem filtro), a página SHALL mostrar "Nenhuma criança cadastrada" e o botão "Nova criança". Com busca ou filtro sem resultado, SHALL mostrar "Nenhuma criança encontrada" e o botão "Limpar filtros", que volta para `/criancas`. Se a busca falhar, SHALL mostrar a mensagem de erro da integração com a API e o botão "Tentar de novo". Um `401` SHALL seguir o fluxo de sessão expirada.

A lista SHALL mostrar "Atualizado agora" quando os dados têm menos de 1 minuto e "Atualizado há N min" depois disso, e o botão "Atualizar", que busca de novo só a lista mostrada.

#### Scenario: Nenhuma criança
- **WHEN** a usuária abre `/criancas` e a API devolve uma lista vazia, sem filtro
- **THEN** a página mostra "Nenhuma criança cadastrada" e o botão "Nova criança"

#### Scenario: Filtro sem resultado
- **WHEN** a usuária busca "zzz" e a API devolve uma lista vazia
- **THEN** a página mostra "Nenhuma criança encontrada" e "Limpar filtros", e clicar em "Limpar filtros" leva a `/criancas` com o campo de busca vazio e "Todas as turmas"

#### Scenario: API indisponível
- **WHEN** a usuária abre `/criancas` e a API responde `500`
- **THEN** a página mostra "Não foi possível falar com o servidor. Tente de novo em instantes." e o botão "Tentar de novo"

#### Scenario: Atualizar
- **WHEN** a lista foi buscada há 3 minutos e mostra "Atualizado há 3 min", e a usuária clica em "Atualizar"
- **THEN** só a lista mostrada é buscada de novo, e o texto passa a "Atualizado agora"

### Requirement: Formulário de criança
As páginas protegidas `/criancas/nova` (título de nível 1 "Nova criança", título de aba "Nova criança · Educare") e `/criancas/<id>/editar` (título de nível 1 "Editar criança", com o nome da criança no subtítulo, e título de aba "Editar criança · Educare") SHALL mostrar o mesmo formulário, em seções com os títulos e campos:

- "Turma": "Turma" (seletor com as turmas em ordem alfabética);
- "Dados pessoais": "Nome completo", "Data de nascimento", "Naturalidade", "Nacionalidade", "Gênero" ("Feminino", "Masculino", "Outro"), "Raça/cor" ("Branca", "Preta", "Parda", "Amarela", "Indígena") e "Estado civil" ("Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)");
- "Documentos": "CPF", "RG" e "Certidão de nascimento" (ver "Certidão de nascimento no formulário");
- "Endereço": "CEP", "Endereço", "Número", "Complemento", "Bairro", "Cidade" e "UF" (seletor com as 27 siglas);
- "Religião": "Religião" e "Igreja";
- "Saúde": "Laudo", "Medicação" e "Observação médica", em campos de várias linhas.

Os obrigatórios ("Turma", "Nome completo", "Data de nascimento", "CEP", "Endereço", "Número", "Bairro", "Cidade" e "UF") SHALL ter "*" no rótulo. Os seletores opcionais SHALL ter a opção "Não informar". "CPF" SHALL usar a máscara `000.000.000-00` e "CEP" a máscara `00000-000`. Todo campo SHALL ter rótulo visível e, enquanto houver erro, `aria-invalid` e a mensagem ligada por `aria-describedby`. Os botões SHALL ser "Cancelar" e "Cadastrar criança" (cadastro) ou "Salvar alterações" (edição), com alvo de toque de pelo menos 44 px. "Cancelar" SHALL levar à lista (cadastro) ou aos detalhes (edição).

Na edição, o formulário SHALL abrir preenchido com os dados atuais da criança, inclusive a turma atual e a certidão.

#### Scenario: Abrir o cadastro
- **WHEN** a usuária clica em "Nova criança" na lista
- **THEN** ela é levada a `/criancas/nova`, com o formulário vazio, as seções "Turma", "Dados pessoais", "Documentos", "Endereço", "Religião" e "Saúde", e o botão "Cadastrar criança"

#### Scenario: Abrir a edição
- **WHEN** a usuária está nos detalhes de "Ana Lima", da "Turma 1", e clica em "Editar"
- **THEN** ela é levada a `/criancas/<id>/editar` com o formulário preenchido, "Turma 1" no seletor e o botão "Salvar alterações"

### Requirement: Validação do formulário de criança
O formulário SHALL ser validado antes do envio, e com erro nada SHALL ser enviado à API; o foco SHALL ir para o primeiro campo com erro. Os textos SHALL ser enviados sem espaços nas pontas, e opcionais vazios ou só com espaços SHALL ser enviados como ausentes. As regras e mensagens SHALL ser:

- obrigatório vazio: "Escolha a turma.", "Informe o nome completo.", "Informe a data de nascimento.", "Informe o CEP.", "Informe o endereço.", "Informe o número.", "Informe o bairro.", "Informe a cidade.", "Escolha a UF.";
- tamanho máximo, contado sem os espaços das pontas: nome completo e naturalidade 150, endereço 200, número 20, complemento 100, bairro 100, cidade 100, nacionalidade 100, religião 100, igreja 150, RG 20, laudo 2000, medicação 1000, observação médica 2000 caracteres; acima disso, "Use no máximo N caracteres.";
- data de nascimento inexistente: "Data inválida."; no futuro (no fuso de São Paulo): "A data de nascimento não pode ser no futuro.";
- CEP sem 8 números: "O CEP tem 8 números.";
- CPF informado com dígitos verificadores errados ou com menos de 11 números: "CPF inválido.";
- RG informado sem nenhuma letra ou número: "RG inválido.".

O CPF e o CEP SHALL ser enviados só com os números.

#### Scenario: Obrigatórios vazios
- **WHEN** a usuária clica em "Cadastrar criança" com o formulário vazio
- **THEN** cada obrigatório mostra a sua mensagem (inclusive "Escolha a turma."), o foco vai para "Turma", e nenhuma requisição é feita à API

#### Scenario: CPF inválido
- **WHEN** a usuária digita o CPF "123.456.789-00" e envia
- **THEN** "CPF inválido." aparece junto ao campo "CPF", e nada é enviado

#### Scenario: Data no futuro
- **WHEN** em 01/11/2026 a usuária informa a data de nascimento 02/11/2026 e envia
- **THEN** "A data de nascimento não pode ser no futuro." aparece junto ao campo, e nada é enviado

#### Scenario: Espaços e máscaras
- **WHEN** a usuária informa o nome "  Ana Lima ", o CPF "529.982.247-25", o CEP "01310-100", deixa "Complemento" com "   " e envia
- **THEN** a API recebe o nome "Ana Lima", o CPF "52998224725", o CEP "01310100" e nenhum complemento

### Requirement: Certidão de nascimento no formulário
Na seção "Documentos", o seletor "Certidão de nascimento" SHALL ter as opções "Não informar" (padrão), "Modelo novo (matrícula)" e "Modelo antigo (livro, folha e termo)".

- Com "Modelo novo (matrícula)", SHALL aparecer o campo "Matrícula", obrigatório, com a máscara `000000 00 00 0000 0 00000 000 0000000 00` e a dica "32 números, no alto da certidão". A matrícula SHALL ter 32 números ("A matrícula tem 32 números."); os dois dígitos verificadores SHALL conferir, o 15º número (tipo de livro) SHALL ser 1 (livro de nascimento) e o ano do registro (do 11º ao 14º número) SHALL estar entre o ano de nascimento e o ano atual; senão, "Matrícula inválida. Confira os números.". Vazia: "Informe a matrícula.". A matrícula SHALL ser enviada só com os números.
- Com "Modelo antigo (livro, folha e termo)", SHALL aparecer os campos "Cartório", "Livro", "Folha" e "Termo", todos obrigatórios ("Informe o cartório.", "Informe o livro.", "Informe a folha.", "Informe o termo."), com no máximo 200 caracteres no cartório e 20 em livro, folha e termo. A cidade do cartório faz parte do nome do cartório.
- Trocar de modelo SHALL limpar os campos do outro modelo e os erros deles; "Não informar" SHALL esconder e limpar todos. Só os campos do modelo escolhido SHALL ser enviados; com "Não informar", nenhum dado de certidão SHALL ser enviado.

#### Scenario: Matrícula curta
- **WHEN** a usuária escolhe "Modelo novo (matrícula)", digita 31 números e envia
- **THEN** "A matrícula tem 32 números." aparece junto ao campo "Matrícula", e nada é enviado

#### Scenario: Dígito verificador errado
- **WHEN** a usuária digita uma matrícula de 32 números com o último número trocado e envia
- **THEN** "Matrícula inválida. Confira os números." aparece junto ao campo, e nada é enviado

#### Scenario: Matrícula válida
- **WHEN** a usuária digita uma matrícula válida, preenche os obrigatórios e envia
- **THEN** a API recebe a certidão no modelo novo com os 32 números, sem pontuação nem espaços, e sem cartório, livro, folha e termo

#### Scenario: Modelo antigo incompleto
- **WHEN** a usuária escolhe "Modelo antigo (livro, folha e termo)", preenche cartório, livro e folha, deixa "Termo" em branco e envia
- **THEN** "Informe o termo." aparece junto ao campo "Termo", e nada é enviado

#### Scenario: Trocar de modelo
- **WHEN** a usuária digita uma matrícula, troca para "Modelo antigo (livro, folha e termo)" e depois para "Não informar", e envia o formulário com os obrigatórios
- **THEN** a matrícula some ao trocar de modelo, os campos do modelo antigo somem ao escolher "Não informar", e a API não recebe nenhum dado de certidão

### Requirement: Erros da API no formulário de criança
Se a API responder `400` com `errors`, cada mensagem SHALL aparecer junto ao campo correspondente (por exemplo, "Turma não encontrada" em "Turma"), e o formulário SHALL manter o que foi digitado. Se a API responder `409` por documento já usado por outra criança, o campo SHALL mostrar "Já existe uma criança com este CPF.", "Já existe uma criança com este RG." ou "Já existe uma criança com esta certidão." (na "Matrícula" ou no "Termo", conforme o modelo), sem repetir o número. Outros erros (`403`, `5xx`, falha de rede, `400` sem erro de campo) SHALL aparecer num alerta no topo do formulário, com a mensagem da integração com a API. Ao editar um campo, o erro vindo da API para ele SHALL sumir. Durante o envio, o botão de enviar SHALL ficar desabilitado. Uma gravação que falha SHALL NOT atualizar nenhuma lista nem contagem. Um `401` SHALL seguir o fluxo de sessão expirada.

#### Scenario: CPF já usado
- **WHEN** a usuária envia um CPF que outra criança já tem, e a API responde `409`
- **THEN** "Já existe uma criança com este CPF." aparece junto ao campo "CPF", os campos continuam preenchidos, e a lista de crianças e as contagens das turmas não são buscadas de novo

#### Scenario: Turma excluída enquanto preenchia
- **WHEN** a API responde `400` com `{"title": "Bad Request", "status": 400, "errors": [{"field": "classroomId", "message": "Turma não encontrada"}]}`
- **THEN** "Turma não encontrada" aparece junto ao campo "Turma"

#### Scenario: Servidor indisponível
- **WHEN** a usuária clica em "Cadastrar criança" e a API não responde em 10 segundos
- **THEN** o alerta "Não foi possível falar com o servidor. Tente de novo em instantes." aparece no topo do formulário, e os campos continuam preenchidos

#### Scenario: Envio em andamento
- **WHEN** a usuária clica em "Salvar alterações" e a API ainda não respondeu
- **THEN** o botão "Salvar alterações" fica desabilitado

### Requirement: Cadastrar criança
Ao cadastrar com sucesso, a usuária SHALL ser levada aos detalhes da criança nova, com o aviso "Criança cadastrada.". A criança SHALL ficar na turma escolhida desde a data de hoje. Se não houver turmas cadastradas, `/criancas/nova` SHALL mostrar, no lugar do seletor de turma, o aviso "Cadastre uma turma antes." com o link "Ir para Turmas" (`/configuracoes/turmas`) para `COORDENADOR`, ou com o texto "Peça a um(a) coordenador(a) para cadastrar uma turma." para as demais roles, e o botão "Cadastrar criança" SHALL ficar desabilitado.

#### Scenario: Cadastrar
- **WHEN** existe a "Turma 1" com 0 crianças, e a usuária preenche os obrigatórios, escolhe "Turma 1" e clica em "Cadastrar criança"
- **THEN** ela é levada aos detalhes da criança com o aviso "Criança cadastrada.", e, sem recarregar a página, a lista de crianças mostra a criança nova e Configurações › Turmas mostra "1" em Crianças na "Turma 1"

#### Scenario: Sem turmas para um COORDENADOR
- **WHEN** não há turmas, e um `COORDENADOR` abre `/criancas/nova`
- **THEN** a página mostra "Cadastre uma turma antes." com o link "Ir para Turmas", e "Cadastrar criança" fica desabilitado

#### Scenario: Sem turmas para uma EDUCADOR
- **WHEN** não há turmas, e uma `EDUCADOR` abre `/criancas/nova`
- **THEN** a página mostra "Cadastre uma turma antes." e "Peça a um(a) coordenador(a) para cadastrar uma turma.", sem o link, e "Cadastrar criança" fica desabilitado

### Requirement: Editar criança e trocar de turma
Ao salvar a edição com sucesso, a usuária SHALL ser levada aos detalhes da criança, com o aviso "Dados da criança salvos.". Na edição, enquanto a turma escolhida for diferente da atual, o formulário SHALL mostrar, junto ao campo "Turma", o aviso "A criança sai da <turma atual> hoje e entra na <nova turma>. A mudança fica no histórico.". Voltar à turma atual SHALL esconder o aviso. A troca de turma SHALL valer a partir da data de hoje, sem campo de data.

#### Scenario: Trocar de turma
- **WHEN** "Ana Lima" está na "Turma 1" desde 01/10/2026, e em 01/11/2026 a usuária edita, escolhe "Turma 2" e clica em "Salvar alterações"
- **THEN** antes de salvar aparece "A criança sai da Turma 1 hoje e entra na Turma 2. A mudança fica no histórico."; depois, os detalhes mostram a turma "Turma 2", o histórico mostra "Turma 2 · desde 01/11/2026" e "Turma 1 · 01/10/2026 – 01/11/2026", e Configurações › Turmas mostra as contagens das duas turmas atualizadas, sem recarregar a página

#### Scenario: Salvar sem trocar de turma
- **WHEN** a usuária edita só o endereço de "Ana Lima" e salva
- **THEN** ela vê os detalhes com o aviso "Dados da criança salvos.", e o histórico de turmas não muda

### Requirement: Sair do formulário com alterações não salvas
Enquanto o formulário de criança tiver alterações não salvas, sair por um link do app, por "Cancelar" ou pelo voltar do navegador SHALL abrir a confirmação "Sair sem salvar?", com o texto "As alterações feitas neste formulário serão perdidas." e os botões "Continuar editando" e "Sair sem salvar". Fechar a aba ou recarregar a página SHALL pedir a confirmação do próprio navegador. Sem alterações, ou depois de salvar com sucesso, a saída SHALL acontecer sem perguntar.

#### Scenario: Cancelar com alterações
- **WHEN** a usuária altera o nome no formulário e clica em "Cancelar"
- **THEN** aparece "Sair sem salvar?"; com "Continuar editando", ela fica no formulário com o nome alterado; com "Sair sem salvar", ela sai do formulário

#### Scenario: Sair pelo menu
- **WHEN** a usuária altera um campo e clica em "Turmas" na barra lateral
- **THEN** aparece "Sair sem salvar?" antes de sair

#### Scenario: Depois de salvar
- **WHEN** a usuária salva com sucesso
- **THEN** ela vai para os detalhes sem a confirmação

### Requirement: Detalhes da criança
A página protegida `/criancas/<id>` SHALL ter o título de aba "Criança · Educare" e mostrar um cabeçalho com um avatar com as iniciais, o nome como título de nível 1, a idade e a data de nascimento ("4 anos · 10/03/2022"), a turma atual num selo e os botões "Editar", que leva a `/criancas/<id>/editar`, e "Excluir", este só para `COORDENADOR`. Abaixo, SHALL mostrar cartões com os títulos "Dados pessoais", "Documentos", "Endereço", "Religião", "Saúde" e "Histórico de turmas", com cada campo do formulário com o seu rótulo e o seu valor (listas fixas traduzidas como no formulário). Campos opcionais vazios SHALL mostrar "Não informado". A página SHALL ter um link "Voltar para Crianças" para a lista. No celular, os cartões SHALL ficar um abaixo do outro e os botões com alvo de toque de pelo menos 44 px. A página SHALL funcionar e manter contraste de pelo menos 4,5:1 nos modos claro e escuro.

#### Scenario: Ver todos os dados
- **WHEN** a usuária abre os detalhes de uma criança com todos os campos preenchidos
- **THEN** a página mostra o cabeçalho e os cartões "Dados pessoais", "Documentos", "Endereço", "Religião", "Saúde" e "Histórico de turmas", todos preenchidos

#### Scenario: Opcionais vazios
- **WHEN** a usuária abre os detalhes de uma criança só com os obrigatórios
- **THEN** naturalidade, nacionalidade, gênero, raça/cor, estado civil, CPF, RG, certidão de nascimento, complemento, religião, igreja, laudo, medicação e observação médica mostram "Não informado"

#### Scenario: Editar e excluir por role
- **WHEN** uma `EDUCADOR` abre os detalhes de uma criança
- **THEN** a página mostra o botão "Editar" e não mostra "Excluir"

#### Scenario: Editar sem nova requisição
- **WHEN** a usuária abriu os detalhes há menos de 1 minuto e clica em "Editar"
- **THEN** o formulário abre preenchido sem nova chamada à API para buscar a criança

### Requirement: Documentos mascarados nos detalhes
No cartão "Documentos", o CPF SHALL aparecer mascarado, só com os 3 primeiros e os 2 últimos números ("529.***.***-25"), e o RG só com os 2 últimos caracteres ("******8X"), cada um com o botão "Mostrar" (nome acessível "Mostrar CPF", "Mostrar RG"), que mostra o valor completo e passa a "Ocultar". A certidão de nascimento SHALL aparecer como:

- modelo novo: "Modelo novo" e a matrícula com os 15 primeiros e os 2 últimos números visíveis e o resto com "•" ("104539 01 55 2022 1 ••••• ••• ••••••• 72"), com o botão "Mostrar" (nome acessível "Mostrar matrícula");
- modelo antigo: "Modelo antigo" e "Cartório <cartório> · Livro <livro> · Folha <folha> · Termo <termo>";
- sem certidão: "Não informado".

Mostrar ou ocultar SHALL NOT fazer nova chamada à API. Ao sair da página, os documentos SHALL voltar a aparecer mascarados.

#### Scenario: CPF mascarado
- **WHEN** a usuária abre os detalhes de uma criança com o CPF `52998224725`
- **THEN** o cartão mostra "529.***.***-25"; ao clicar em "Mostrar CPF", mostra "529.982.247-25" e o botão passa a "Ocultar", sem nova chamada à API

#### Scenario: Certidão no modelo novo
- **WHEN** a criança tem a matrícula `10453901552022100012345612345672`
- **THEN** o cartão mostra "Modelo novo" e "104539 01 55 2022 1 ••••• ••• ••••••• 72", com o botão "Mostrar matrícula"

#### Scenario: Certidão no modelo antigo
- **WHEN** a criança tem a certidão no modelo antigo, do "Cartório do 1º Ofício de Campinas", livro "A-12", folha "34" e termo "5678"
- **THEN** o cartão mostra "Modelo antigo" e "Cartório do 1º Ofício de Campinas · Livro A-12 · Folha 34 · Termo 5678"

### Requirement: Histórico de turmas
O cartão "Histórico de turmas" SHALL listar as turmas pelas quais a criança passou, da mais recente para a mais antiga. A turma atual SHALL aparecer como "<turma> · desde <dd/mm/aaaa>", e as anteriores como "<turma> · <entrada> – <saída>", com as datas no formato `dd/mm/aaaa`. Se o histórico não puder ser buscado, o cartão SHALL mostrar a mensagem de erro da integração com a API e o botão "Tentar de novo", sem esconder o resto da página.

#### Scenario: Histórico com troca
- **WHEN** a criança esteve na "Turma 1" de 01/10/2026 a 01/11/2026 e está na "Turma 2" desde 01/11/2026
- **THEN** o cartão mostra "Turma 2 · desde 01/11/2026" e, abaixo, "Turma 1 · 01/10/2026 – 01/11/2026"

#### Scenario: Só a turma atual
- **WHEN** a criança foi cadastrada na "Turma 1" em 01/10/2026 e nunca trocou de turma
- **THEN** o cartão mostra só "Turma 1 · desde 01/10/2026"

### Requirement: Excluir criança
O botão "Excluir", só para `COORDENADOR`, SHALL abrir um modal com o título "Excluir <nome>?", a descrição "Os dados e o histórico de turmas da criança serão apagados.", o alerta "Essa ação não pode ser desfeita." e os botões "Cancelar" e "Excluir criança", este na cor de perigo. Ao abrir, o foco SHALL ir para "Cancelar"; o modal SHALL prender o foco e fechar com "Cancelar", `Esc` ou clique fora, devolvendo o foco ao botão "Excluir". Nada SHALL ser enviado à API antes de "Excluir criança". Durante o envio, os botões do modal SHALL ficar desabilitados e o modal SHALL NOT fechar por `Esc` nem por clique fora.

Ao excluir com sucesso, a usuária SHALL ser levada a `/criancas`, com o aviso "Criança excluída.", e a criança SHALL sumir da lista e das contagens das turmas sem recarregar a página. Se a API responder `404`, o resultado SHALL ser o mesmo, com o aviso "Essa criança não existe mais.". Outros erros (`403`, `5xx`, falha de rede) SHALL aparecer num alerta dentro do modal, que continua aberto, e nada SHALL ser atualizado.

#### Scenario: Excluir
- **WHEN** um `COORDENADOR` abre os detalhes de "Ana Lima", da "Turma 1", clica em "Excluir" e depois em "Excluir criança"
- **THEN** ele é levado a `/criancas` com o aviso "Criança excluída.", "Ana Lima" não aparece na lista, e Configurações › Turmas mostra uma criança a menos na "Turma 1", sem recarregar a página

#### Scenario: Cancelar
- **WHEN** o `COORDENADOR` clica em "Excluir" e depois em "Cancelar"
- **THEN** o modal fecha, nenhuma requisição de exclusão é feita, e o foco volta ao botão "Excluir"

#### Scenario: Falha ao excluir
- **WHEN** o `COORDENADOR` confirma a exclusão e a API responde `500`
- **THEN** o modal continua aberto com "Não foi possível falar com o servidor. Tente de novo em instantes.", e a lista e as contagens não são buscadas de novo

#### Scenario: Sem permissão na API
- **WHEN** a API responde `403` à exclusão
- **THEN** o modal continua aberto com "Você não tem permissão para fazer isso."

### Requirement: Criança não encontrada
Se a API responder `404` ao buscar a criança em `/criancas/<id>` ou `/criancas/<id>/editar`, ou se o id não for um id válido, a página SHALL mostrar o título de nível 1 "Criança não encontrada", o texto "Ela pode ter sido excluída ou o endereço está errado." e o link "Voltar para Crianças", com o título de aba "Criança não encontrada · Educare" e a resposta do servidor com o status `404`. Outros erros ao buscar a criança SHALL mostrar a mensagem de erro da integração com a API e o botão "Tentar de novo".

#### Scenario: Id inexistente
- **WHEN** a usuária abre `/criancas/<id que não existe>`
- **THEN** a página mostra "Criança não encontrada" e o link "Voltar para Crianças"

#### Scenario: Editar criança inexistente
- **WHEN** a usuária abre `/criancas/<id que não existe>/editar`
- **THEN** a página mostra "Criança não encontrada" e não mostra o formulário

#### Scenario: Criança excluída
- **WHEN** a criança foi excluída e a usuária volta pelo navegador aos detalhes dela
- **THEN** a página mostra "Criança não encontrada"

### Requirement: Dados de crianças atualizados sem recarregar
Depois de cadastrar, editar ou excluir uma criança com sucesso, a lista de crianças (todas as páginas e filtros), os detalhes, o histórico de turmas e as contagens das turmas SHALL aparecer atualizados na próxima vez que forem mostrados, sem a usuária recarregar a página. Uma gravação que falha SHALL NOT provocar nenhuma nova busca. Voltar a uma lista ou a detalhes de criança buscados há menos de 1 minuto, sem nenhuma gravação no meio, SHALL NOT fazer nova chamada à API; depois de 1 minuto, os dados guardados SHALL aparecer na hora e ser atualizados em segundo plano. A lista de turmas usada no filtro e no formulário SHALL ser reaproveitada por 5 minutos.

Ao abrir ou recarregar diretamente `/criancas` (com os filtros do endereço), `/criancas/<id>` ou `/criancas/<id>/editar`, a página SHALL chegar do servidor já com os dados, sem marcadores de carregamento, e o navegador SHALL NOT repetir essas chamadas. Passar o ponteiro ou o foco sobre um link para os detalhes ou sobre "Editar" SHALL antecipar a busca da criança, de forma que a página abra já carregada.

#### Scenario: Voltar à lista sem nova chamada
- **WHEN** a usuária abre `/criancas`, vai aos detalhes de uma criança e volta à lista em menos de 1 minuto, sem gravar nada
- **THEN** a lista aparece na hora, sem marcadores de carregamento e sem nova chamada à API

#### Scenario: Lista atualizada depois de cadastrar
- **WHEN** a usuária abriu `/criancas` filtrada pela "Turma 1", cadastra uma criança na "Turma 1" e volta à lista
- **THEN** a lista mostra a criança nova, e Configurações › Turmas mostra a contagem atualizada, sem recarregar a página

#### Scenario: Recarregar a lista
- **WHEN** a usuária aperta F5 em `/criancas?nome=joao`
- **THEN** a página chega do servidor já com a lista filtrada, sem marcadores de carregamento, e o navegador não faz nova chamada para a lista

#### Scenario: Antecipar os detalhes
- **WHEN** a usuária passa o ponteiro sobre "Ana Lima" na lista e depois clica
- **THEN** os detalhes abrem já carregados

### Requirement: Proteção dos dados das crianças
A lista SHALL receber e guardar só o resumo de cada criança (id, nome, data de nascimento e turma atual); CPF, RG, certidão, endereço e dados de saúde SHALL aparecer só nos detalhes e no formulário de edição. Nenhum dado de criança SHALL ser registrado em log, nem no servidor do front nem no navegador, e nenhum SHALL ser gravado no armazenamento do navegador (`localStorage`, `sessionStorage`, IndexedDB ou cookies). Os títulos de aba das páginas de uma criança SHALL NOT conter o nome dela, porque ficam no histórico do navegador. Mensagens de erro de documento já usado SHALL NOT repetir o número do documento. Os dados SHALL chegar ao navegador só pelo servidor do front, nunca direto da API.

#### Scenario: Resumo na lista
- **WHEN** a usuária abre `/criancas`
- **THEN** a resposta que chega ao navegador para a lista não tem CPF, RG, certidão, endereço nem dados de saúde

#### Scenario: Título de aba sem o nome
- **WHEN** a usuária abre os detalhes de "Ana Lima"
- **THEN** o título da aba é "Criança · Educare"

#### Scenario: Sair limpa os dados
- **WHEN** a usuária abre os detalhes de uma criança e depois clica em "Sair"
- **THEN** nenhum dado da criança fica guardado no navegador
