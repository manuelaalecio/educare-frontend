## MODIFIED Requirements

### Requirement: Usuário logado no cabeçalho
Toda página protegida SHALL mostrar no cabeçalho, no botão do menu do usuário, o nome do usuário da sessão e a função dele ("Coordenador(a)" para `COORDENADOR`, "Educador(a)" para `EDUCADOR`, uma role desconhecida como veio), obtidos de `GET /api/v1/auth/me` pelo servidor do frontend. Em telas com menos de 768 px de largura, o botão SHALL mostrar só as iniciais, e o nome SHALL continuar no nome acessível do botão e dentro do menu do usuário. Os dados SHALL refletir o estado atual da API a cada carregamento completo da página.

#### Scenario: Cabeçalho de um COORDENADOR
- **WHEN** o usuário `admin@educare.org`, de nome `Administrador` e role `COORDENADOR`, abre `/` numa tela de 1440 px
- **THEN** o botão do menu do usuário mostra "Administrador" como nome e "Coordenador(a)" como função

#### Scenario: Cabeçalho de um EDUCADOR
- **WHEN** a usuária `ana.souza@educare.org`, de nome `Ana Souza` e role `EDUCADOR`, abre `/` numa tela de 1440 px
- **THEN** o botão do menu do usuário mostra "Ana Souza" e "Educador(a)"

#### Scenario: Cabeçalho de um ADMIN
- **WHEN** um usuário com a role antiga `ADMIN` abre `/` numa tela de 1440 px
- **THEN** o botão do menu do usuário mostra "ADMIN" como função, e não "Administrador"

#### Scenario: Cabeçalho de um USER
- **WHEN** um usuário com a role antiga `USER` abre `/` numa tela de 1440 px
- **THEN** o botão do menu do usuário mostra "USER" como função, e não "Funcionário"

#### Scenario: Cabeçalho no celular
- **WHEN** a usuária `ana.souza@educare.org` abre `/` numa tela de 390 px
- **THEN** o botão do menu do usuário mostra "AS" e tem o nome acessível "Menu do usuário: Ana Souza"

### Requirement: Página Minha conta
A página protegida `/minha-conta` SHALL ter o título de aba "Minha conta · Educare", o título de nível 1 "Minha conta" e o texto "Seus dados de acesso ao Educare.". Ela SHALL ter um card de perfil, só para leitura, com: um avatar com as iniciais do usuário (mesma regra do menu do usuário); o nome do usuário como título de nível 2; a função ("Coordenador(a)" para `COORDENADOR`, "Educador(a)" para `EDUCADOR`, uma role desconhecida como veio); e uma lista com "Email de acesso" (o login), "Função" e "Membro desde". "Membro desde" SHALL mostrar o mês por extenso, em minúsculas, e o ano da data de cadastro (`createdAt`) no fuso de São Paulo, no formato "<mês> de <ano>" (por exemplo, "março de 2026"). O card SHALL terminar com o texto "Nome, email e função são alterados por um(a) coordenador(a), em Configurações." e SHALL NOT ter campos editáveis. Os dados SHALL vir de `GET /api/v1/auth/me`, pelo servidor do frontend, e refletir o estado atual da API a cada carregamento completo da página.

A página SHALL ter também um card com o título de nível 2 "Senha", o texto "Troque sua senha se desconfiar de acesso indevido. Os outros dispositivos conectados à sua conta são desconectados." e o botão "Alterar senha" (ver "Trocar a própria senha").

#### Scenario: Perfil de um EDUCADOR
- **WHEN** a usuária `ana.souza@educare.org`, de nome `Ana Souza`, role `EDUCADOR` e `createdAt` `2026-03-12T14:00:00Z`, abre `/minha-conta`
- **THEN** a página mostra "Minha conta", "AS", "Ana Souza", "Educador(a)", "ana.souza@educare.org" em "Email de acesso", "março de 2026" em "Membro desde" e "Nome, email e função são alterados por um(a) coordenador(a), em Configurações.", e não há campo editável no card de perfil

#### Scenario: Perfil de um COORDENADOR
- **WHEN** o usuário `admin@educare.org`, de nome `Administrador` e role `COORDENADOR`, abre `/minha-conta`
- **THEN** a função aparece como "Coordenador(a)", e o avatar mostra "AD"

#### Scenario: Perfil de um USER
- **WHEN** um usuário com a role antiga `USER` abre `/minha-conta`
- **THEN** a função aparece como "USER", e não "Funcionário"

#### Scenario: Perfil de um ADMIN
- **WHEN** um usuário com a role antiga `ADMIN` abre `/minha-conta`
- **THEN** a função aparece como "ADMIN", e não "Administrador"

#### Scenario: Data de cadastro na virada do mês
- **WHEN** o usuário tem `createdAt` `2026-11-01T01:30:00Z` (31 de outubro, 22h30, em São Paulo) e abre `/minha-conta`
- **THEN** "Membro desde" mostra "outubro de 2026"

#### Scenario: Card de senha
- **WHEN** a usuária abre `/minha-conta`
- **THEN** a página mostra o card "Senha" com o botão "Alterar senha", e nenhum campo de senha aparece antes de clicar no botão

#### Scenario: Página exige sessão
- **WHEN** um visitante sem cookie de sessão abre `/minha-conta`
- **THEN** ele é levado a `/login?redirect=%2Fminha-conta`, e o HTML servido não contém os dados de nenhum usuário
