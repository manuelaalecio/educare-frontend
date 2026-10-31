# Spec Delta

## ADDED Requirements

### Requirement: Página Minha conta
A página protegida `/minha-conta` SHALL ter o título de aba "Minha conta · Educare", o título de nível 1 "Minha conta" e o texto "Seus dados de acesso ao Educare.". Ela SHALL ter um card de perfil, só para leitura, com: um avatar com as iniciais do usuário (mesma regra do menu do usuário); o nome do usuário como título de nível 2; a função ("Administrador" para `ADMIN`, "Funcionário" para `USER`, uma role desconhecida como veio); e uma lista com "Email de acesso" (o login), "Função" e "Membro desde". "Membro desde" SHALL mostrar o mês por extenso, em minúsculas, e o ano da data de cadastro (`createdAt`) no fuso de São Paulo, no formato "<mês> de <ano>" (por exemplo, "março de 2026"). O card SHALL terminar com o texto "Nome, email e função são alterados por um administrador, em Configurações." e SHALL NOT ter campos editáveis. Os dados SHALL vir de `GET /api/v1/auth/me`, pelo servidor do frontend, e refletir o estado atual da API a cada carregamento completo da página.

A página SHALL ter também um card com o título de nível 2 "Senha", o texto "Troque sua senha se desconfiar de acesso indevido. Os outros dispositivos conectados à sua conta são desconectados." e o botão "Alterar senha" (ver "Trocar a própria senha").

#### Scenario: Perfil de um USER
- **WHEN** a usuária `ana.souza@educare.org`, de nome `Ana Souza`, role `USER` e `createdAt` `2026-03-12T14:00:00Z`, abre `/minha-conta`
- **THEN** a página mostra "Minha conta", "AS", "Ana Souza", "Funcionário", "ana.souza@educare.org" em "Email de acesso" e "março de 2026" em "Membro desde", e não há campo editável no card de perfil

#### Scenario: Perfil de um ADMIN
- **WHEN** o usuário `admin@educare.org`, de nome `Administrador` e role `ADMIN`, abre `/minha-conta`
- **THEN** a função aparece como "Administrador", e o avatar mostra "AD"

#### Scenario: Data de cadastro na virada do mês
- **WHEN** o usuário tem `createdAt` `2026-11-01T01:30:00Z` (31 de outubro, 22h30, em São Paulo) e abre `/minha-conta`
- **THEN** "Membro desde" mostra "outubro de 2026"

#### Scenario: Card de senha
- **WHEN** a usuária abre `/minha-conta`
- **THEN** a página mostra o card "Senha" com o botão "Alterar senha", e nenhum campo de senha aparece antes de clicar no botão

#### Scenario: Página exige sessão
- **WHEN** um visitante sem cookie de sessão abre `/minha-conta`
- **THEN** ele é levado a `/login?redirect=%2Fminha-conta`, e o HTML servido não contém os dados de nenhum usuário

### Requirement: Endereço antigo da troca de senha
A URL `/minha-conta/senha` SHALL levar o usuário com sessão a `/minha-conta`, sem abrir o modal "Alterar senha" e sem mostrar um formulário de senha. Sem sessão, SHALL seguir a regra de "Rotas protegidas por padrão".

#### Scenario: URL antiga com sessão
- **WHEN** a usuária `ana.souza@educare.org`, logada, abre `/minha-conta/senha`
- **THEN** ela é levada a `/minha-conta`, e o modal "Alterar senha" não está aberto

#### Scenario: URL antiga sem sessão
- **WHEN** um visitante sem cookie de sessão abre `/minha-conta/senha`
- **THEN** ele é levado a `/login?redirect=%2Fminha-conta%2Fsenha`

## MODIFIED Requirements

### Requirement: Rotas protegidas por padrão
Toda página SHALL exigir sessão, exceto `/login`. Sem cookie de sessão, o acesso a uma página protegida SHALL levar a `/login?redirect=<caminho pedido>` antes de renderizar qualquer dado da página, inclusive na renderização no servidor. Um usuário com sessão que abre `/login` SHALL ser levado a `/`.

#### Scenario: Acesso sem sessão
- **WHEN** um visitante sem cookie de sessão abre `/minha-conta`
- **THEN** ele é levado a `/login?redirect=%2Fminha-conta`, e o HTML servido não contém o card de perfil

#### Scenario: Usuário logado abre o login
- **WHEN** um usuário com sessão válida abre `/login`
- **THEN** ele é levado a `/`

### Requirement: Volta à página pedida
Depois do login, o usuário SHALL ser levado ao caminho do parâmetro `redirect` quando ele for um caminho interno: começa com `/`, não começa com `//` nem com `/\` e não é `/login`. Em qualquer outro caso, inclusive sem o parâmetro, SHALL ser levado a `/`.

#### Scenario: Volta para a página pedida
- **WHEN** a usuária abre `/login?redirect=%2Fminha-conta` e faz login com sucesso
- **THEN** ela é levada a `/minha-conta`

#### Scenario: Redirect externo ignorado
- **WHEN** a usuária abre `/login?redirect=https%3A%2F%2Fmalicioso.example` ou `/login?redirect=%2F%2Fmalicioso.example` e faz login com sucesso
- **THEN** ela é levada a `/`

### Requirement: Trocar a própria senha
O botão "Alterar senha" da página `/minha-conta` SHALL abrir um modal com o título "Alterar senha", o texto "Confirme sua senha atual e escolha uma nova.", os campos "Senha atual", "Nova senha" e "Confirmar nova senha", o aviso "Você continua conectado aqui. Os outros dispositivos precisarão entrar de novo com a nova senha." e os botões "Cancelar" e "Alterar senha". O modal SHALL abrir com os campos vazios e o foco em "Senha atual", SHALL manter o foco do teclado dentro dele enquanto estiver aberto e, ao fechar, SHALL devolver o foco ao botão "Alterar senha" da página.

Sob "Nova senha", o modal SHALL mostrar desde a abertura a dica "De 8 a 72 caracteres, diferente da senha atual e do seu email.". Cada campo SHALL ter um botão para mostrar e ocultar a senha, com os nomes acessíveis "Mostrar senha atual", "Mostrar nova senha" e "Mostrar confirmar nova senha" quando a senha está oculta, e "Ocultar senha atual", "Ocultar nova senha" e "Ocultar confirmar nova senha" quando está visível.

Antes de enviar, o modal SHALL exigir os três campos, "Nova senha" com 8 a 72 caracteres e no máximo 72 bytes em UTF-8, e a confirmação igual à nova senha, mostrando o erro junto ao campo (ligado a ele por `aria-describedby`), sem chamar a API. No envio, o servidor do frontend SHALL chamar `PUT /api/v1/auth/me/password` com a senha atual e a nova, e, enquanto a chamada não terminar, o botão "Alterar senha" do modal SHALL ficar desabilitado e o modal SHALL NOT fechar.

Com `200`, o servidor do frontend SHALL gravar o `accessToken` devolvido no cookie de sessão (ver "Cookie de sessão protegido", com `Max-Age` igual ao `expiresIn` devolvido), e o modal SHALL fechar, descartar os valores digitados e mostrar o toast "Senha alterada. Outros dispositivos foram desconectados.", mantendo o usuário logado, inclusive depois de recarregar a página. Com `400`, o modal SHALL continuar aberto e mostrar os erros de `errors` junto aos campos correspondentes (`currentPassword` em "Senha atual", `newPassword` em "Nova senha"). Com `429`, o modal SHALL continuar aberto e mostrar o alerta "Muitas tentativas. Tente novamente em alguns minutos.". Com outra falha, o modal SHALL continuar aberto e mostrar num alerta a mensagem geral do erro. Com `401`, SHALL valer o fluxo de sessão expirada.

"Cancelar", `Esc` e um clique fora do modal SHALL fechá-lo sem chamar a API, descartando os valores digitados e os erros.

#### Scenario: Abrir o modal
- **WHEN** a usuária, em `/minha-conta`, clica em "Alterar senha"
- **THEN** abre o modal "Alterar senha" com os três campos vazios, o foco em "Senha atual" e a dica "De 8 a 72 caracteres, diferente da senha atual e do seu email." sob "Nova senha"

#### Scenario: Senha trocada
- **WHEN** a usuária `ana.souza@educare.org`, com senha `segredo123`, preenche "Senha atual" com `segredo123` e "Nova senha" e "Confirmar nova senha" com `novaSenha456`, clica em "Alterar senha" do modal, e a API responde `200` com um `accessToken` novo e `"expiresIn": 28800`
- **THEN** o modal fecha, aparece o toast "Senha alterada. Outros dispositivos foram desconectados.", o cookie `educare_session` passa a conter o token novo com `Max-Age=28800`, e ela continua em `/minha-conta`, logada, depois de recarregar a página

#### Scenario: Senha atual incorreta
- **WHEN** a usuária preenche "Senha atual" com `errada123` e a nova senha válida e confirmada, e a API responde `400` com uma entrada em `errors` para `currentPassword`
- **THEN** o modal continua aberto, a mensagem da API aparece junto a "Senha atual", e não aparece o toast de sucesso

#### Scenario: Nova senha recusada pela API
- **WHEN** a API responde `400` com uma entrada em `errors` para `newPassword` (por exemplo, nova senha igual à atual ou ao email)
- **THEN** o modal continua aberto, e a mensagem da API aparece junto a "Nova senha"

#### Scenario: Muitas tentativas
- **WHEN** a usuária envia o modal com campos válidos, e a API responde `429`
- **THEN** o modal continua aberto e mostra o alerta "Muitas tentativas. Tente novamente em alguns minutos."

#### Scenario: API indisponível na troca
- **WHEN** a API não responde, e a usuária envia o modal com campos válidos
- **THEN** o modal continua aberto e mostra o alerta "Não foi possível falar com o servidor. Tente de novo em instantes."

#### Scenario: Confirmação diferente
- **WHEN** a usuária preenche "Nova senha" com `novaSenha456` e "Confirmar nova senha" com `novaSenha789`, e clica em "Alterar senha" do modal
- **THEN** aparece um erro junto a "Confirmar nova senha", e nenhuma requisição é feita à API

#### Scenario: Nova senha curta
- **WHEN** a usuária preenche "Nova senha" e a confirmação com `curta`, e clica em "Alterar senha" do modal
- **THEN** aparece um erro junto a "Nova senha", e nenhuma requisição é feita à API

#### Scenario: Mostrar a senha
- **WHEN** a usuária digita em "Nova senha" e clica em "Mostrar nova senha"
- **THEN** o texto de "Nova senha" fica visível, e o botão passa a se chamar "Ocultar nova senha"

#### Scenario: Cancelar descarta
- **WHEN** a usuária digita nos três campos, fecha o modal com "Cancelar", `Esc` ou um clique fora, e abre o modal de novo
- **THEN** os três campos estão vazios, sem erros, nenhuma requisição foi feita à API, e, ao fechar, o foco voltou ao botão "Alterar senha" da página

#### Scenario: Envio em andamento
- **WHEN** a usuária envia o modal com campos válidos e a API ainda não respondeu
- **THEN** o botão "Alterar senha" do modal fica desabilitado, um segundo clique não faz outra requisição, e `Esc` não fecha o modal
