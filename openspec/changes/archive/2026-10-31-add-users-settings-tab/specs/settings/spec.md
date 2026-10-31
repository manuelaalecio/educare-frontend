## MODIFIED Requirements

### Requirement: Configurações só para administradores
Todo endereço de `/configuracoes` (a própria `/configuracoes` e as abas abaixo dela) SHALL ser uma página protegida acessível só a usuários com role `COORDENADOR`. Um usuário com outra role (inclusive `EDUCADOR` e as roles antigas `ADMIN` e `USER`) que abrir qualquer um desses endereços, digitando-o ou por um link, SHALL ser levado a `/` sem ver o conteúdo da área, e esse endereço SHALL NOT ficar no histórico de navegação. Um visitante sem sessão SHALL ser levado ao login, como em qualquer página protegida.

#### Scenario: EDUCADOR abre a aba Turmas
- **WHEN** a usuária `ana.souza@educare.org`, de role `EDUCADOR`, abre `/configuracoes/turmas`
- **THEN** ela é levada a `/`, a página não mostra "Configurações" como título de nível 1, e voltar no navegador não leva de novo a `/configuracoes/turmas`

#### Scenario: EDUCADOR abre a aba Usuários
- **WHEN** a mesma usuária abre `/configuracoes/usuarios`
- **THEN** ela é levada a `/`, e nenhuma lista de usuários é buscada na API

#### Scenario: EDUCADOR abre Configurações
- **WHEN** a mesma usuária abre `/configuracoes`
- **THEN** ela é levada a `/`

#### Scenario: USER abre a aba Turmas
- **WHEN** um usuário com a role antiga `USER` abre `/configuracoes/turmas`
- **THEN** ele é levado a `/`

#### Scenario: USER abre Configurações
- **WHEN** um usuário com a role antiga `USER` abre `/configuracoes`
- **THEN** ele é levado a `/`

#### Scenario: ADMIN abre a aba Turmas
- **WHEN** um usuário com a role antiga `ADMIN` abre `/configuracoes/turmas`
- **THEN** ele é levado a `/`, sem ver a área Configurações

#### Scenario: Sem sessão
- **WHEN** um visitante sem sessão abre `/configuracoes/turmas`
- **THEN** ele é levado a `/login?redirect=%2Fconfiguracoes%2Fturmas`

#### Scenario: COORDENADOR abre a aba Turmas
- **WHEN** o usuário `admin@educare.org`, de role `COORDENADOR`, abre `/configuracoes/turmas`
- **THEN** a página mostra a área Configurações com a aba "Turmas"

### Requirement: Cabeçalho e abas de Configurações
Toda aba de Configurações SHALL mostrar, acima do conteúdo da aba, o título de nível 1 "Configurações", o texto "Usuários do sistema e turmas da escola. Só coordenadores(as) acessam esta área." e uma navegação com o nome acessível "Seções das configurações" contendo, nessa ordem, os links "Usuários" (`/configuracoes/usuarios`) e "Turmas" (`/configuracoes/turmas`), cada um com ícone e alvo de toque de pelo menos 44 px de altura. O link da aba atual SHALL ter `aria-current="page"` e destaque visual (linha embaixo na cor primária e texto na cor principal; as outras abas ficam com texto atenuado), com contraste de pelo menos 4,5:1 nos modos claro e escuro. Trocar de aba SHALL mudar o endereço sem recarregar a página inteira.

#### Scenario: Abas na aba Turmas
- **WHEN** um `COORDENADOR` abre `/configuracoes/turmas`
- **THEN** a página mostra "Configurações", "Usuários do sistema e turmas da escola. Só coordenadores(as) acessam esta área." e a navegação "Seções das configurações" com "Usuários" e "Turmas", e só "Turmas" tem `aria-current="page"`

#### Scenario: Trocar de aba
- **WHEN** um `COORDENADOR` está em `/configuracoes/turmas` e clica em "Usuários"
- **THEN** ele é levado a `/configuracoes/usuarios` sem recarregar a página inteira, e só "Usuários" tem `aria-current="page"`

### Requirement: Endereço de Configurações abre a primeira aba
Para um `COORDENADOR`, `/configuracoes` SHALL redirecionar para `/configuracoes/usuarios`, sem deixar `/configuracoes` no histórico de navegação.

#### Scenario: Abrir Configurações pela barra lateral
- **WHEN** um `COORDENADOR` clica em "Configurações" na barra lateral
- **THEN** ele é levado a `/configuracoes/usuarios`, e a aba "Usuários" tem `aria-current="page"`

## REMOVED Requirements

### Requirement: Aba Usuários provisória
**Reason**: A aba Usuários passa a ter a lista e os modais de usuário.
**Migration**: O comportamento da aba fica na capability `users` ("Lista de usuários" e seguintes).
