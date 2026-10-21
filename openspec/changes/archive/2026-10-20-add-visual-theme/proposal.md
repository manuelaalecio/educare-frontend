# Proposal

## Why

O visual do frontend ainda é o do template: os componentes do shadcn usam a paleta `zinc` (preto e cinza), e o `src/styles.css` carrega variáveis, gradientes e classes de uma landing page que o projeto não usa. Antes da primeira tela real (o login, na `add-login-page`), o Educare precisa da identidade dele: verde emerald para a marca e as ações, com neutros puxados ao verde (a opção C escolhida nos modelos) e um modo escuro.

## What Changes

- **Paleta**: os tokens do shadcn (`--primary`, `--background`, `--border`, `--ring` etc.) passam a usar `emerald` como cor principal e uma escala de neutros esverdeados própria, `sage` (50 a 950), disponível também como classes do Tailwind (`bg-sage-100`, `text-sage-600`...). Cores de apoio: `teal` para informação, `amber` para avisos e `red` para erros.
- **Contraste acessível**: o botão principal usa `emerald-700` com texto branco no modo claro e `emerald-500` com texto `emerald-950` no escuro. Todo texto sobre fundo do tema passa o contraste mínimo de 4,5:1.
- **Modo escuro**:
  - segue a preferência do sistema operacional por padrão;
  - um botão no canto da tela alterna entre claro e escuro, e a escolha fica salva no navegador;
  - a página já abre no tema certo, sem piscar o tema errado.
- **Fonte única**: Manrope. A Fraunces do template sai.
- **Limpeza do template**: saem do `styles.css` as variáveis `--sea-ink`, `--lagoon`, `--palm` e parecidas, os gradientes e a grade do `body` e as classes `.island-shell`, `.feature-card`, `.nav-link`, `.page-wrap`, `.display-title`, `.rise-in` e `.site-footer`, que nada usa.
- **Documento base**: `lang="pt-BR"` e título "Educare" no `__root.tsx`.

## Non-goals

- Logo definitivo do Educare: a tela de login usa um ícone provisório até a escola ter um.
- Cabeçalho, menu e layout da área autenticada (ficam na `add-backend-integration`). O botão de tema fica no canto da tela até existir um cabeçalho.
- Estilo de gráficos (`--chart-*`) e da barra lateral (`--sidebar-*`): ajustados só para ficarem coerentes, sem desenho próprio, até existirem telas que usem.
- Salvar a preferência de tema no servidor ou por usuário.

## Capabilities

### New Capabilities
- `visual-theme`: a aparência do sistema. Cobre a paleta (claro e escuro), o contraste mínimo, a escolha e a persistência do tema e a abertura da página sem piscar.

### Modified Capabilities
<!-- Nenhuma: o projeto ainda não tem specs em openspec/specs/. -->

## Impact

- **Código**:
  - `src/styles.css` (reescrito: tokens, escala `sage`, limpeza);
  - `src/routes/__root.tsx` (script de tema no `<head>`, `lang`, título, botão de tema);
  - novo `src/components/theme/` (botão de tema e funções de leitura e gravação da preferência).
- **Componentes shadcn**: nenhuma mudança nos arquivos; eles já usam os tokens e a variante `dark:`.
- **Dependências**: nenhuma nova (`lucide-react` já fornece os ícones de sol e lua).
- **Ordem**: aplicar antes da `add-login-page`, para o login já sair com as cores certas. Os modelos aprovados estão em https://claude.ai/artifact/HYtQQYnvXnrrVT2r3DsU6w (opção C).
- **Sobreposição**: a tarefa 5.1 da `add-backend-integration` também ajusta `lang` e título no `__root.tsx`. Ela passa a só conferir o que esta change já fez.
