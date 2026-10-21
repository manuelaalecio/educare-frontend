# Spec Delta

## Purpose

Dar ao Educare uma aparência própria e consistente, com verde emerald para a marca e as ações, neutros esverdeados, modo claro e escuro e contraste acessível em todas as telas.

## ADDED Requirements

### Requirement: Paleta verde
A interface SHALL usar as cores abaixo em todos os componentes que dependem do tema:

| Papel | Claro | Escuro |
|---|---|---|
| Fundo da página | `sage-100` `#eef4f1` | `sage-950` `#0b110e` |
| Superfícies (cards, popovers) | branco | `sage-900` `#151d19` |
| Texto principal | `sage-900` `#151d19` | `sage-50` `#f6faf8` |
| Texto secundário | `sage-500` `#5f7268` | `sage-400` `#94a89f` |
| Bordas | `sage-200` `#dde7e2` | `sage-800` `#232e29` |
| Bordas de campos | `sage-300` `#c4d3cc` | `sage-700` `#37453f` |
| Ação principal (fundo / texto) | `emerald-700` `#047857` / branco | `emerald-500` `#10b981` / `emerald-950` `#022c22` |
| Foco | `emerald-600` `#059669` | `emerald-400` `#34d399` |
| Erro | `red-600` `#dc2626` | `red-400` `#f87171` |

A escala `sage` (50 `#f6faf8`, 100 `#eef4f1`, 200 `#dde7e2`, 300 `#c4d3cc`, 400 `#94a89f`, 500 `#5f7268`, 600 `#4b5c54`, 700 `#37453f`, 800 `#232e29`, 900 `#151d19`, 950 `#0b110e`) SHALL estar disponível como cores do Tailwind. O texto SHALL usar a fonte Manrope.

#### Scenario: Botão principal no modo claro
- **WHEN** a página está no modo claro e mostra um botão principal (variante padrão)
- **THEN** o botão tem fundo `#047857` e texto branco

#### Scenario: Botão principal no modo escuro
- **WHEN** a página está no modo escuro e mostra um botão principal
- **THEN** o botão tem fundo `#10b981` e texto `#022c22`

#### Scenario: Escala sage nas classes
- **WHEN** um componente usa a classe `bg-sage-100`
- **THEN** o fundo dele é `#eef4f1`

### Requirement: Contraste mínimo
Todo par de texto e fundo da tabela de "Paleta verde" usado para texto SHALL ter contraste de pelo menos 4,5:1, nos dois modos.

#### Scenario: Pares do tema conferidos
- **WHEN** o contraste é calculado para texto principal, texto secundário e texto da ação principal sobre os fundos em que aparecem (fundo da página e superfícies), nos dois modos
- **THEN** todos os pares têm contraste de pelo menos 4,5:1

### Requirement: Escolha do tema
Sem preferência salva, o tema SHALL seguir a preferência de cores do sistema operacional (`prefers-color-scheme`) e acompanhar uma mudança dela com a página aberta. Toda página SHALL ter um botão que alterna entre claro e escuro, com o nome acessível "Usar tema escuro" no modo claro e "Usar tema claro" no escuro. Ao clicar, a escolha SHALL ser salva no navegador e valer nas próximas visitas, sobrepondo a preferência do sistema.

#### Scenario: Primeira visita com o sistema escuro
- **WHEN** um visitante sem preferência salva abre o sistema num computador configurado no modo escuro
- **THEN** a página aparece no modo escuro, e o botão tem o nome "Usar tema claro"

#### Scenario: Escolha salva
- **WHEN** um visitante no modo escuro clica em "Usar tema claro" e depois recarrega a página
- **THEN** a página aparece no modo claro, mesmo com o sistema no modo escuro

#### Scenario: Sistema muda com a página aberta
- **WHEN** um visitante sem preferência salva está com a página aberta e muda o sistema de claro para escuro
- **THEN** a página passa para o modo escuro sem recarregar

#### Scenario: Armazenamento bloqueado
- **WHEN** o navegador bloqueia o armazenamento local, e o visitante clica no botão de tema
- **THEN** o tema muda na página aberta, sem erro, e a próxima visita volta a seguir o sistema

### Requirement: Abertura sem piscar
O tema escolhido ou o do sistema SHALL estar aplicado antes da primeira pintura da página, inclusive na renderização no servidor, de forma que a página nunca apareça no tema errado e depois troque.

#### Scenario: Recarregar no modo escuro
- **WHEN** um visitante com o tema escuro salvo recarrega qualquer página
- **THEN** a primeira pintura já está no modo escuro, sem um quadro com fundo claro

#### Scenario: Sem avisos de hidratação
- **WHEN** a página abre no modo escuro
- **THEN** o console do navegador não mostra avisos de hidratação do React causados pelo tema
