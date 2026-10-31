# Spec Delta

## Purpose

Dar aos administradores do Educare uma área "Configurações", separada em abas com endereço próprio, onde ficam os cadastros que estruturam a escola (usuários e turmas), fora do alcance dos funcionários comuns.

## ADDED Requirements

### Requirement: Configurações só para administradores
Todo endereço de `/configuracoes` (a própria `/configuracoes` e as abas abaixo dela) SHALL ser uma página protegida acessível só a usuários com role `ADMIN`. Um usuário com outra role que abrir qualquer um desses endereços, digitando-o ou por um link, SHALL ser levado a `/` sem ver o conteúdo da área, e esse endereço SHALL NOT ficar no histórico de navegação. Um visitante sem sessão SHALL ser levado ao login, como em qualquer página protegida.

#### Scenario: USER abre a aba Turmas
- **WHEN** a usuária `ana.souza@educare.org`, de role `USER`, abre `/configuracoes/turmas`
- **THEN** ela é levada a `/`, a página não mostra "Configurações" como título de nível 1, e voltar no navegador não leva de novo a `/configuracoes/turmas`

#### Scenario: USER abre Configurações
- **WHEN** a mesma usuária abre `/configuracoes`
- **THEN** ela é levada a `/`

#### Scenario: Sem sessão
- **WHEN** um visitante sem sessão abre `/configuracoes/turmas`
- **THEN** ele é levado a `/login?redirect=%2Fconfiguracoes%2Fturmas`

#### Scenario: ADMIN abre a aba Turmas
- **WHEN** o usuário `admin@educare.org`, de role `ADMIN`, abre `/configuracoes/turmas`
- **THEN** a página mostra a área Configurações com a aba "Turmas"

### Requirement: Cabeçalho e abas de Configurações
Toda aba de Configurações SHALL mostrar, acima do conteúdo da aba, o título de nível 1 "Configurações", o texto "Usuários do sistema e turmas da escola. Só administradores acessam esta área." e uma navegação com o nome acessível "Seções das configurações" contendo, nessa ordem, os links "Usuários" (`/configuracoes/usuarios`) e "Turmas" (`/configuracoes/turmas`), cada um com ícone e alvo de toque de pelo menos 44 px de altura. O link da aba atual SHALL ter `aria-current="page"` e destaque visual (linha embaixo na cor primária e texto na cor principal; as outras abas ficam com texto atenuado), com contraste de pelo menos 4,5:1 nos modos claro e escuro. Trocar de aba SHALL mudar o endereço sem recarregar a página inteira.

#### Scenario: Abas na aba Turmas
- **WHEN** um `ADMIN` abre `/configuracoes/turmas`
- **THEN** a página mostra "Configurações", "Usuários do sistema e turmas da escola. Só administradores acessam esta área." e a navegação "Seções das configurações" com "Usuários" e "Turmas", e só "Turmas" tem `aria-current="page"`

#### Scenario: Trocar de aba
- **WHEN** um `ADMIN` está em `/configuracoes/turmas` e clica em "Usuários"
- **THEN** ele é levado a `/configuracoes/usuarios` sem recarregar a página inteira, e só "Usuários" tem `aria-current="page"`

### Requirement: Endereço de Configurações abre a primeira aba
Para um `ADMIN`, `/configuracoes` SHALL redirecionar para `/configuracoes/usuarios`, sem deixar `/configuracoes` no histórico de navegação.

#### Scenario: Abrir Configurações pela barra lateral
- **WHEN** um `ADMIN` clica em "Configurações" na barra lateral
- **THEN** ele é levado a `/configuracoes/usuarios`, e a aba "Usuários" tem `aria-current="page"`

### Requirement: Aba Usuários provisória
A aba `/configuracoes/usuarios` SHALL mostrar o título de nível 2 "Usuários" e o texto "Esta seção ainda está em construção.", com o título de aba do navegador "Usuários · Configurações · Educare". Ela SHALL NOT buscar dados na API.

#### Scenario: Aba Usuários
- **WHEN** um `ADMIN` abre `/configuracoes/usuarios`
- **THEN** a página mostra "Usuários" e "Esta seção ainda está em construção.", e a aba do navegador se chama "Usuários · Configurações · Educare"
