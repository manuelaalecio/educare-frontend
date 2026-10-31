## Purpose

Permitir que a coordenação cadastre, edite, redefina a senha e exclua os usuários do Educare, definindo a função de cada um (Coordenador(a) ou Educador(a)), pela aba Configurações › Usuários, no desktop e no celular.

## ADDED Requirements

### Requirement: Lista de usuários
A aba `/configuracoes/usuarios` SHALL ter o título de aba do navegador "Usuários · Configurações · Educare" e mostrar uma seção com o título de nível 2 "Usuários", o subtítulo "N pessoas com acesso ao sistema" (ou "1 pessoa com acesso ao sistema"), com o total devolvido pela API, e o botão "Novo usuário". Os usuários SHALL aparecer na ordem da API (por nome), 20 por página.

Em telas com 768 px ou mais, os usuários SHALL aparecer numa tabela com o nome acessível "Usuários" e as colunas "Nome", "Email", "Função", "Criado em" e "Ações". "Nome" SHALL mostrar um avatar com as iniciais (mesma regra do menu do usuário) e o nome. A linha do usuário da sessão SHALL ter o selo "Você". "Função" SHALL mostrar "Coordenador(a)" para `COORDENADOR` e "Educador(a)" para `EDUCADOR`, num selo; uma role desconhecida aparece como veio. "Criado em" SHALL mostrar a data no formato `dd/mm/aaaa`, no fuso de São Paulo. Em telas menores, cada usuário SHALL aparecer num card com avatar, nome, email, o selo da função, o selo "Você" quando for o caso, e as ações.

Cada usuário SHALL ter os botões de ícone "Editar <nome>", "Redefinir a senha de <nome>" e "Excluir <nome>", com alvo de toque de pelo menos 44 × 44 px e o de excluir na cor de perigo. Na linha do usuário da sessão, "Redefinir a senha de <nome>" e "Excluir <nome>" SHALL NOT aparecer. A aba SHALL manter contraste de pelo menos 4,5:1 nos textos nos modos claro e escuro.

#### Scenario: Lista no desktop
- **WHEN** a coordenadora `ana.souza@educare.org` (`COORDENADOR`) abre `/configuracoes/usuarios` numa tela de 1440 px, e a API devolve Ana Souza (`COORDENADOR`, criada em `2026-03-12T14:00:00Z`) e Carlos Lima (`EDUCADOR`)
- **THEN** a tabela "Usuários" mostra "Ana Souza" com o selo "Você", "Coordenador(a)" e "12/03/2026", e "Carlos Lima" com "Educador(a)"; o subtítulo é "2 pessoas com acesso ao sistema"

#### Scenario: Ações da própria linha
- **WHEN** a mesma coordenadora vê a lista
- **THEN** a linha dela tem "Editar Ana Souza", sem "Redefinir a senha de Ana Souza" nem "Excluir Ana Souza", e a linha de Carlos Lima tem as três ações

#### Scenario: Cards no celular
- **WHEN** a coordenadora abre a aba numa tela de 390 px
- **THEN** a aba mostra os usuários em cards com nome, email e função, e não mostra a tabela

### Requirement: Paginação
Abaixo da lista, a aba SHALL mostrar "Mostrando X–Y de Z" e os botões "Anterior" e "Próxima". "Anterior" SHALL estar desabilitado na primeira página e "Próxima" na última. A página atual SHALL ficar no endereço como `?pagina=N` (a partir de 1; sem o parâmetro, ou com um valor inválido, vale a página 1). Trocar de página SHALL NOT recarregar a página inteira. Se a página pedida passar da última, a aba SHALL ir para a última página, sem deixar a anterior no histórico.

#### Scenario: Segunda página
- **WHEN** existem 25 usuários e a coordenadora clica em "Próxima"
- **THEN** o endereço passa a `/configuracoes/usuarios?pagina=2`, a aba mostra "Mostrando 21–25 de 25", e "Próxima" fica desabilitado

#### Scenario: Página só
- **WHEN** existem 5 usuários
- **THEN** a aba mostra "Mostrando 1–5 de 5", com "Anterior" e "Próxima" desabilitados

### Requirement: Carregamento e erro da lista
Enquanto a lista é buscada, a aba SHALL mostrar marcadores de carregamento no lugar dos usuários, sem subtítulo nem paginação. Se a busca falhar, a aba SHALL mostrar a mensagem da integração com a API (por exemplo, "Não foi possível falar com o servidor. Tente de novo em instantes.") e o botão "Tentar de novo", que busca a lista de novo. Um `401` SHALL seguir o fluxo de sessão expirada.

#### Scenario: API indisponível
- **WHEN** a coordenadora abre a aba e a API responde `500`
- **THEN** a aba mostra "Não foi possível falar com o servidor. Tente de novo em instantes." e "Tentar de novo"

#### Scenario: Tentar de novo
- **WHEN** a aba mostra o erro, a API volta a responder, e a coordenadora clica em "Tentar de novo"
- **THEN** a lista aparece no lugar da mensagem

### Requirement: Campos de usuário
Nos modais "Novo usuário" e "Editar usuário", os campos SHALL ser validados antes do envio, com o erro junto ao campo, ligado por `aria-describedby` e com `aria-invalid`; com erro, nada SHALL ser enviado. "Nome" (placeholder "Nome completo") é gravado sem espaços nas pontas e SHALL ter de 1 a 150 caracteres ("Informe o nome.", "Use no máximo 150 caracteres."). "Email" (placeholder "nome@educare.org") é gravado sem espaços nas pontas e SHALL ter o formato `nome@dominio.tld` e no máximo 254 caracteres ("Informe o email.", "Informe um email válido.", "Use no máximo 254 caracteres."). "Função" SHALL ser um seletor com "Educador(a)" e "Coordenador(a)", com a dica "Coordenadores(as) também acessam as configurações.". Um `409` de email já cadastrado SHALL mostrar "Já existe um usuário com esse email." junto ao campo "Email", com o modal aberto. Um `400` com `errors` por campo SHALL mostrar a mensagem da API junto ao campo correspondente (`login` → "Email"). Ao editar um campo, o erro vindo da API para ele SHALL sumir.

#### Scenario: Email duplicado
- **WHEN** a coordenadora tenta criar, ou editar outro usuário para, "carlos.lima@educare.org", e a API responde `409`
- **THEN** o modal continua aberto com "Já existe um usuário com esse email." junto ao campo "Email", e a lista não muda

#### Scenario: Email inválido
- **WHEN** a coordenadora digita "carlos" em "Email" e clica em "Criar usuário"
- **THEN** aparece "Informe um email válido." junto ao campo, e nenhuma requisição é feita

### Requirement: Novo usuário
O botão "Novo usuário" SHALL abrir o modal "Novo usuário", com a descrição "A pessoa entra no sistema com este email e a senha definida aqui.", os campos "Nome", "Email", "Senha" (placeholder "Senha inicial", com o botão de mostrar e ocultar) e "Função" (com "Educador(a)" escolhido), e os botões "Cancelar" e "Criar usuário". A senha SHALL ter de 8 a 72 caracteres, e no máximo 72 bytes em UTF-8 ("Informe a senha.", "Use pelo menos 8 caracteres.", "Use no máximo 72 caracteres.", "A senha é longa demais."). Ao abrir, o foco SHALL ir para "Nome". Ao criar com sucesso, o modal SHALL fechar, a lista SHALL ser buscada de novo e SHALL aparecer o aviso "Usuário criado.".

#### Scenario: Criar educador(a)
- **WHEN** a coordenadora preenche "Mariana Alves", "mariana.alves@educare.org" e "senha-forte-1", mantém "Educador(a)" e clica em "Criar usuário"
- **THEN** o modal fecha, aparece "Usuário criado.", e Mariana Alves entra na lista com "Educador(a)"

#### Scenario: Senha curta
- **WHEN** a senha tem 7 caracteres e a coordenadora clica em "Criar usuário"
- **THEN** aparece "Use pelo menos 8 caracteres." junto a "Senha", e nada é enviado

### Requirement: Editar usuário
O botão "Editar <nome>" SHALL abrir o modal "Editar usuário", com a descrição "Altere o nome, o email de acesso ou a função.", os campos "Nome", "Email" e "Função" preenchidos, sem campo de senha, o texto "Para trocar a senha, use “Redefinir senha” na lista de usuários." e os botões "Cancelar" e "Salvar alterações". Ao salvar com sucesso, o modal SHALL fechar, a lista SHALL ser buscada de novo e SHALL aparecer o aviso "Usuário atualizado.". Se a API recusar o rebaixamento do último coordenador (`409`), o modal SHALL continuar aberto com o alerta "O sistema precisa ter ao menos um(a) coordenador(a)." e nada muda. Se o usuário editado for o da sessão, a sessão SHALL ser recarregada depois do sucesso: o menu do usuário mostra os dados novos, e quem passou a Educador(a) SHALL ser levado a `/`.

#### Scenario: Último coordenador
- **WHEN** Ana Souza é a única `COORDENADOR`, a coordenadora muda a função dela para "Educador(a)", e a API responde `409`
- **THEN** o modal continua aberto com "O sistema precisa ter ao menos um(a) coordenador(a).", e a lista não muda

#### Scenario: Rebaixar a si mesma
- **WHEN** existe outra coordenadora, e Ana Souza muda a própria função para "Educador(a)" com sucesso
- **THEN** ela é levada a `/`, e a barra lateral não mostra mais "Configurações"

### Requirement: Redefinir senha
O botão "Redefinir a senha de <nome>" SHALL abrir o modal "Redefinir senha", com a descrição "A senha atual deixa de funcionar. Avise a pessoa da nova senha.", o avatar, o nome e o email do usuário, os campos "Nova senha" (placeholder "Nova senha") e "Confirmar nova senha" (placeholder "Repita a nova senha"), com o botão de mostrar e ocultar, e os botões "Cancelar" e "Salvar nova senha". "Nova senha" SHALL seguir a regra de senha de "Novo usuário" ("Informe a nova senha." quando vazia), e "Confirmar nova senha" SHALL ser igual ("Confirme a nova senha.", "As senhas não conferem."). Ao abrir, o foco SHALL ir para "Nova senha". Ao salvar com sucesso, o modal SHALL fechar e SHALL aparecer o aviso "Senha redefinida. A pessoa precisa entrar de novo com a nova senha.". A senha SHALL NOT aparecer em log, URL nem mensagem de erro.

#### Scenario: Senhas diferentes
- **WHEN** a coordenadora digita "senha-forte-1" e "senha-forte-2" e clica em "Salvar nova senha"
- **THEN** aparece "As senhas não conferem." junto a "Confirmar nova senha", e nada é enviado

#### Scenario: Redefinir
- **WHEN** as duas senhas são "senha-forte-1" e a coordenadora clica em "Salvar nova senha"
- **THEN** o modal fecha, e aparece "Senha redefinida. A pessoa precisa entrar de novo com a nova senha."

### Requirement: Excluir usuário
O botão "Excluir <nome>" SHALL abrir um modal com o título "Excluir <nome>?", a descrição "<nome> (<email>) perde o acesso ao sistema.", o alerta "Essa ação não pode ser desfeita." e os botões "Cancelar" e "Excluir usuário", este na cor de perigo. Ao abrir, o foco SHALL ir para "Cancelar". Nada SHALL ser enviado antes de "Excluir usuário". Ao excluir com sucesso, o modal SHALL fechar, a lista SHALL ser buscada de novo e SHALL aparecer o aviso "Usuário excluído."; se a página ficar vazia, a aba SHALL ir para a página anterior. Se a API responder `409`, o modal SHALL continuar aberto com o alerta "O sistema precisa ter ao menos um(a) coordenador(a).".

#### Scenario: Excluir
- **WHEN** a coordenadora clica em "Excluir Carlos Lima" e depois em "Excluir usuário"
- **THEN** o modal fecha, Carlos Lima sai da lista, e aparece "Usuário excluído."

#### Scenario: Último coordenador
- **WHEN** a coordenadora confirma a exclusão de um `COORDENADOR` e a API responde `409`
- **THEN** o modal continua aberto com "O sistema precisa ter ao menos um(a) coordenador(a).", e o usuário continua na lista

### Requirement: Comportamento comum dos modais de usuário
Os modais de usuário SHALL prender o foco enquanto abertos e fechar com "Cancelar", com `Esc` ou com um clique fora, devolvendo o foco ao botão que os abriu (ou, se o usuário saiu da lista, ao botão "Novo usuário"). Fechar SHALL descartar o que foi digitado e os erros. Durante o envio, os botões do modal SHALL ficar desabilitados e o modal SHALL NOT fechar por `Esc` nem por clique fora. Se a API responder `404` ao editar, redefinir a senha ou excluir, o modal SHALL fechar, a lista SHALL ser buscada de novo e SHALL aparecer o aviso "Esse usuário não existe mais. A lista foi atualizada.". Outros erros (`403`, `5xx`, falha de rede, `400` sem erro de campo) SHALL aparecer num alerta dentro do modal, com a mensagem da integração com a API. Um `401` SHALL seguir o fluxo de sessão expirada.

#### Scenario: Usuário excluído por outra pessoa
- **WHEN** a coordenadora tenta editar Carlos Lima, que outra coordenadora já excluiu, e a API responde `404`
- **THEN** o modal fecha, a lista é buscada de novo sem Carlos Lima, e aparece "Esse usuário não existe mais. A lista foi atualizada."

#### Scenario: Envio em andamento
- **WHEN** a coordenadora clica em "Criar usuário" e a API ainda não respondeu
- **THEN** "Cancelar" e "Criar usuário" ficam desabilitados, e `Esc` não fecha o modal
