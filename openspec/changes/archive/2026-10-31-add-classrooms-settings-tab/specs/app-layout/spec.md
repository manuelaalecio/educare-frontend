# Spec Delta

## MODIFIED Requirements

### Requirement: Cabeçalho das páginas protegidas
Toda página protegida SHALL ter um cabeçalho. Em telas com 768 px ou mais, ele SHALL mostrar, à esquerda, o botão de recolher (ver "Recolher a barra lateral no desktop") e o título da área atual; à direita, o botão de tema (com os nomes acessíveis "Usar tema escuro" e "Usar tema claro") e o botão do menu do usuário. O título SHALL ser "Início" em `/`, "Alunos" em `/alunos`, "Responsáveis" em `/responsaveis`, "Turmas" em `/turmas`, "Configurações" em `/configuracoes` e nas abas abaixo dele (como `/configuracoes/turmas`) e "Minha conta" em `/minha-conta`. Nas páginas protegidas, o botão de tema SHALL ficar só no cabeçalho; no `/login`, SHALL continuar no canto superior direito da página.

#### Scenario: Cabeçalho no desktop
- **WHEN** a usuária abre `/turmas` numa tela de 1440 px no modo claro
- **THEN** o cabeçalho mostra "Recolher menu", o título "Turmas", o botão "Usar tema escuro" e o botão do menu do usuário

#### Scenario: Título em Minha conta
- **WHEN** a usuária abre `/minha-conta` numa tela de 1440 px
- **THEN** o cabeçalho mostra o título "Minha conta"

#### Scenario: Título numa aba de Configurações
- **WHEN** um `ADMIN` abre `/configuracoes/turmas` numa tela de 1440 px
- **THEN** o cabeçalho mostra o título "Configurações", e o link "Configurações" da barra lateral tem `aria-current="page"`

#### Scenario: Um único botão de tema
- **WHEN** a usuária abre `/` com sessão
- **THEN** a página tem exatamente um botão com o nome "Usar tema escuro" ou "Usar tema claro", dentro do cabeçalho

#### Scenario: Botão de tema no login
- **WHEN** um visitante sem sessão abre `/login`
- **THEN** a página tem o botão de tema no canto superior direito

### Requirement: Páginas provisórias das áreas
As páginas `/alunos`, `/responsaveis` e `/turmas` SHALL existir como páginas protegidas, cada uma com um título de nível 1 igual ao nome da área ("Alunos", "Responsáveis", "Turmas"), o texto "Esta página ainda está em construção." e o título de aba "<área> · Educare". Elas SHALL NOT buscar dados na API. A área `/configuracoes` deixa de ser provisória (ver a capability `settings`).

#### Scenario: Página provisória de Alunos
- **WHEN** a usuária abre `/alunos`
- **THEN** a página mostra o título "Alunos" e "Esta página ainda está em construção.", e a aba do navegador se chama "Alunos · Educare"

#### Scenario: Página provisória exige sessão
- **WHEN** um visitante sem sessão abre `/turmas`
- **THEN** ele é levado a `/login?redirect=%2Fturmas`
