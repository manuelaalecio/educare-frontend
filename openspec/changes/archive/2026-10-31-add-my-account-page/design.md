# Design

## Context

Motivação e escopo em `proposal.md`; comportamento em `specs/auth/spec.md` e `specs/app-layout/spec.md`.

Estado atual, lido no código:

- `src/routes/_authenticated/minha-conta/senha.tsx` renderiza `ChangePasswordForm` dentro de um `Card` ("Minha senha"), chamando a server function `changeOwnPassword`. O toast "Senha alterada." sai do próprio formulário.
- `changeOwnPassword` (`functions.ts`) usa o middleware `authenticated`, que injeta o token e transforma um `401` em redirect para o login com o aviso de sessão expirada. Ela chama `performChangePassword` (`auth.ts`), que hoje não recebe os cookies: o `204` não traz nada para gravar.
- `fetchSession` já chama `GET /api/v1/auth/me` em toda carga completa (via `currentUserQuery` no `beforeLoad` de `_authenticated.tsx`), mas `CurrentUser` só guarda `id`, `name`, `login` e `role`. O `MeResponse` do contrato já tem `createdAt`.
- `errors.ts` só conhece `400`, `401`, `403`, `404` e `409`; qualquer outro status vira `unavailable`. Um `429` hoje mostraria "Não foi possível falar com o servidor...".
- `pageTitle` (`nav-items.ts`) já devolve "Minha conta" para `/minha-conta` e abaixo dele. `user-menu.tsx` aponta para `/minha-conta/senha`.
- Não existe `src/components/ui/dialog.tsx`; o `Sheet` do shadcn já usa o `Dialog` do `radix-ui`, então a dependência está instalada.
- O contrato publicado do backend ainda responde `204` em `PUT /auth/me/password`; o `200` com `AccessTokenResponse` e o `429` vêm da subtarefa de back.
- O canvas de design (pranchas "Minha conta · desktop", "· alterar senha (modal)", "· celular" e "· modo escuro") define os textos usados nas specs.

## Goals / Non-Goals

**Goals:**

- A sessão atual sobrevive à troca de senha quando o backend passar a invalidar tokens antigos.
- Nenhuma requisição a mais para montar a página de perfil.
- O front pode ir para produção antes ou depois do back sem quebrar a troca de senha.

**Non-Goals:**

- Reaproveitar o modal para a redefinição de senha pelo admin (fica para a change de Configurações → Usuários; o componente de campo de senha criado aqui pode ser reusado lá).
- Generalizar um "modal de formulário" para o resto do app.

## Decisions

### D1. Rotas: `minha-conta/index.tsx` com a página e `minha-conta/senha.tsx` só com o redirect

`src/routes/_authenticated/minha-conta/index.tsx` vira a página (`head` com "Minha conta · Educare"). `senha.tsx` fica só com `beforeLoad: () => { throw redirect({ to: '/minha-conta', replace: true }) }`, sem componente. Como está sob `_authenticated`, o `beforeLoad` do layout roda antes e cuida do caso sem sessão (vai para `/login?redirect=%2Fminha-conta%2Fsenha`). O `replace` evita que "voltar" leve de novo à URL antiga e a um redirect em loop.

Alternativas descartadas: apagar `senha.tsx` e deixar a URL dar 404 (quebra favoritos e o `redirect` de logins antigos); abrir o modal automaticamente pela URL antiga (a tarefa pede que não abra); um redirect no `vercel.json` (fica fora do router e não passa pela checagem de sessão).

### D2. Dados do perfil vêm da sessão já carregada

`CurrentUser` passa a incluir `createdAt` (`Pick<MeResponse, 'id' | 'name' | 'login' | 'role' | 'createdAt'>`), e `fetchSession` copia o campo. A página lê `user` de `Route.useRouteContext()`, como o `Home` já faz. Assim, a página não faz requisição própria e reflete a API a cada carga completa (regra que o `currentUserQuery` já garante).

Alternativas descartadas: uma server function `getMyProfile` com query própria (segunda chamada a `/auth/me` na mesma carga); devolver o `MeResponse` inteiro (leva `updatedAt` para o navegador sem uso). O `createdAt` não é dado sensível e não vai para log.

### D3. "Membro desde" com `Intl.DateTimeFormat` fixo em São Paulo

Função pura `memberSince(createdAt: string)` em `src/components/layout/user.ts`, ao lado de `initials` e `roleLabel`, com `new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })`, que produz "março de 2026". O fuso fixo faz o SSR (Vercel, em UTC) e o navegador gerarem o mesmo texto, sem erro de hidratação, e acerta a virada do mês para a escola.

Alternativas descartadas: o fuso do navegador (texto diferente entre servidor e cliente); `date-fns` (dependência nova para uma linha); mostrar a data completa (o design pede mês e ano).

### D4. `Dialog` do shadcn para o modal

`npx shadcn@latest add dialog`, com os ajustes do CLAUDE.md (imports nomeados, `npm run check -- --write`). O Radix já entrega foco preso, `Esc`, clique no fundo, `aria-modal`, `aria-labelledby`/`aria-describedby` pelo `DialogTitle`/`DialogDescription` e a volta do foco ao `DialogTrigger` ao fechar. O foco inicial em "Senha atual" fica explícito com `onOpenAutoFocus` (prevenir o padrão e focar o input por `ref`), para não depender da ordem do botão "Fechar" no DOM. O botão "Fechar" (X) do shadcn fica, com o nome acessível "Fechar", como na prancha.

Alternativas descartadas: reaproveitar o `Sheet` (é gaveta, não modal centralizado); escrever o modal à mão (refazer foco preso e acessibilidade que o Radix já resolve); `AlertDialog` (não fecha com clique fora, e o requisito pede que feche).

### D5. Descartar ao fechar desmontando o formulário

O `DialogContent` do Radix desmonta os filhos quando o modal fecha, então o estado do TanStack Form, os erros da API e a visibilidade das senhas somem sem `reset` manual. A página guarda só `open` (`useState`). Enquanto o envio está em andamento, `onOpenChange(false)` é ignorado, e `onEscapeKeyDown`/`onInteractOutside` chamam `preventDefault()`; "Cancelar" e o X ficam desabilitados. Assim, uma resposta que chega depois não age sobre um modal já fechado.

Alternativas descartadas: manter o formulário montado e chamar `form.reset()` em cada fechamento (mais código e fácil de esquecer um estado, como o erro geral); permitir fechar no meio do envio e ignorar a resposta (a senha pode mudar sem o usuário ver o toast).

### D6. `ChangePasswordForm` vira o conteúdo do modal

O componente perde o `Card` e o toast e ganha `onSuccess` e `onCancel`, mantendo `onSubmit` e o tipo `ChangePasswordResult` (isso mantém o componente testável sem server function). Muda os textos para os das specs ("Confirmar nova senha", botão "Alterar senha", aviso "Você continua conectado aqui..."), com o alerta geral no topo, como na prancha. O formulário fica dentro do `DialogContent`, com `DialogFooter` contendo "Cancelar" e o submit. A página (`MyAccountPage`) faz `setOpen(false)` e `toast.success(messages.passwordChanged)` no `onSuccess`.

Um componente novo `PasswordInput` (`src/components/auth/password-input.tsx`) junta o `Input` e o botão de mostrar/ocultar (ícones `Eye`/`EyeOff`, `aria-label` "Mostrar <rótulo em minúsculas>"/"Ocultar <...>"; sem `aria-pressed`, porque o estado já está no nome que muda, como a spec pede). Cada campo controla a própria visibilidade.

A dica de "Nova senha" tem `id` próprio, e o `aria-describedby` do input lista a dica e, quando houver, o erro (`${hintId} ${errorId}`). O erro aparece abaixo da dica, sem trocá-la.

Alternativas descartadas: um formulário novo e apagar o atual (os testes e a validação Zod já cobrem o comportamento e seriam refeitos); o toast dentro do formulário (o formulário não sabe que o modal fecha; o toast pertence ao fluxo da página).

### D7. Token novo gravado no cookie, aceitando também o `204`

`performChangePassword` passa a receber `cookies: Pick<SessionCookies, 'set'>`, como `performLogin`. Depois do `unwrap`, se a resposta trouxer `accessToken` e `expiresIn`, grava com `deps.cookies.set(accessToken, expiresIn)`; se vier sem corpo (o `204` do contrato antigo), não mexe no cookie. `changeOwnPassword` injeta `requestCookies`. O `setCookie` da server function vale para a resposta dessa chamada, então o navegador já tem o token novo antes da próxima requisição. O token nunca é devolvido ao navegador fora do cookie `HttpOnly` e não vai para log.

Alternativas descartadas: exigir o `200` e tratar `204` como erro (o front não poderia ir para produção antes do back); depois do sucesso, mandar o usuário para o login (contraria "a sessão atual continua"); refazer o login no servidor com a nova senha (manda a senha de novo à API sem necessidade).

### D8. `429` vira `too-many-requests` com mensagem fixa

`ApiErrorKind` ganha `'too-many-requests'`, e `toApiError` mapeia `429` para ele mesmo sem `ProblemDetail` no corpo (um proxy pode devolver `429` sem JSON). `messageFor` devolve `messages.tooManyAttempts` ("Muitas tentativas. Tente novamente em alguns minutos."), sem repassar `detail`, para o texto bater com a spec. `toFormError` não muda: o `429` sai como `message`, e o formulário mostra no alerta. `messages.passwordChanged` passa a "Senha alterada. Outros dispositivos foram desconectados.".

Alternativas descartadas: tratar o `429` só em `performChangePassword` (o login também pode receber `429` no futuro e ganharia a mensagem genérica de servidor fora do ar); repassar o `detail` da API (o texto deixa de ser controlado pelo front).

### D9. Menu, título e helpers de teste

`user-menu.tsx` passa a `<Link to='/minha-conta'>`. `pageTitle` não muda (já cobre `/minha-conta`). Em `src/testing/render-route.tsx`, o placeholder `/minha-conta/senha` vira `/minha-conta` ("Página Minha conta"). Os testes que usam `/minha-conta/senha` só como exemplo de caminho protegido (`redirect.test.ts`, `session.test.ts`, `-login.test.tsx`, `-authenticated.test.tsx`, `app-sidebar.test.tsx`, `nav-items.test.ts`) passam a `/minha-conta`, como os cenários das specs.

### D10. Layout da página

Dois `Card` do shadcn, um abaixo do outro, com largura máxima de leitura (`max-w-3xl`), dentro de `<main>` com o `h1` e o subtítulo, seguindo a prancha: o card de perfil com `Avatar` grande, `h2` com o nome, um selo com a função e uma `<dl>` em grade (uma coluna no celular, três a partir de `md`); o card "Senha" com ícone de cadeado, texto e o botão `variant='outline'` com ícone de chave. Cores só pelos tokens do tema (`bg-card`, `text-muted-foreground`, `sage-*` do avatar como no menu), o que cobre o modo escuro sem classes `dark:` novas além das do avatar.

### D11. Textos: o canvas prevalece sobre o resumo da tarefa

Onde a tarefa e o canvas divergem, as specs seguem o canvas, que é a referência visual da tarefa: o card se chama "Senha" (a tarefa diz "Segurança"), a dica é "De 8 a 72 caracteres, diferente da senha atual e do seu email." (a tarefa diz "8 a 72 caracteres") e o terceiro campo é "Confirmar nova senha". Se a revisão preferir os textos da tarefa, a mudança se limita às specs, a `change-password-form.tsx`, à página e aos testes.

## Testes

- **Unitário (Vitest):**
  - `memberSince`: "março de 2026" para `2026-03-12T14:00:00Z` e "outubro de 2026" para `2026-11-01T01:30:00Z` (`user.test.ts`).
  - `toApiError`/`messageFor`: `429` com e sem `ProblemDetail` vira `too-many-requests` com a mensagem fixa (`errors.test.ts`).
  - `performChangePassword`: com `200`, chama `cookies.set(token, expiresIn)`; com `204` sem corpo, não chama; com `400`, devolve os `fieldErrors`; com `429`, devolve a mensagem de muitas tentativas; com `401`, relança (`auth.test.ts`).
  - `fetchSession` devolve `createdAt` (`auth.test.ts`).
- **Testing Library:**
  - `src/routes/-my-account.test.tsx` (substitui `-change-password.test.tsx`): perfil de USER e de ADMIN; abrir o modal com foco em "Senha atual" e a dica visível; sucesso fecha o modal e mostra o toast; `400` em `currentPassword` e em `newPassword` mantém o modal aberto com o erro no campo e o `aria-describedby` certo; `429` mostra o alerta; validação local (confirmação diferente, senha curta) sem chamar a server function; "Cancelar" e `Esc` descartam os valores e devolvem o foco a "Alterar senha"; mostrar/ocultar troca o `type` e o nome do botão; botão desabilitado e `Esc` ignorado durante o envio.
  - Redirect de `/minha-conta/senha` para `/minha-conta` com sessão, e para `/login?redirect=%2Fminha-conta%2Fsenha` sem sessão (`-authenticated.test.tsx`).
  - Menu do usuário: "Minha conta" tem `href="/minha-conta"` e navega para lá (`user-menu.test.tsx`); nenhum item da barra ativo em `/minha-conta` (`app-sidebar.test.tsx`).
- **Manual:**
  - Conferir a página e o modal contra as pranchas em 1440 px, em 390 px e no modo escuro.
  - Com o backend novo rodando: trocar a senha no navegador A, recarregar A (continua logado) e fazer uma ação no navegador B (vai para o login com "Sua sessão expirou..."). Conferir no DevTools que `educare_session` mudou e manteve `HttpOnly`, `SameSite=Lax` e `Max-Age=28800`.
  - Errar a senha atual 6 vezes e ver o alerta de muitas tentativas.
  - Navegação só por teclado: `Tab` não sai do modal, `Esc` fecha e o foco volta ao botão.

## Risks / Trade-offs

- [O contrato novo ainda não está publicado, e o `schema.gen.ts` atual só conhece o `204`; ler `accessToken` não passa no `typecheck`] → A primeira tarefa regenera o schema a partir do contrato novo (publicado, ou o local do `educare-backend` com `API_CONTRACT=...`). Se o back ainda não tiver o contrato, a tarefa do token espera, e o resto da change (página, modal, `429`) segue com o schema atual.
- [Com o backend antigo (`204`), o toast diz "Outros dispositivos foram desconectados." sem que isso aconteça] → Janela curta, até o deploy do back; aceitável porque a tarefa de back vem logo em seguida. Registrar no PR.
- [O fuso fixo de São Paulo não serve para uma escola em outro fuso] → O Educare atende uma escola só, em São Paulo; se mudar, o fuso vira configuração.
- [`createdAt` passa a ficar no cache da sessão no navegador] → É a data de cadastro do funcionário, não dado de criança nem credencial; não aparece em log.
- [O redirect da URL antiga esconde links quebrados no código] → Os testes e o `typecheck` (rotas tipadas) acusam qualquer `to='/minha-conta/senha'` que sobrar, já que a rota continua existindo; a tarefa de busca por `minha-conta/senha` no `src/` fecha isso.

## Migration Plan

1. Deploy normal na Vercel; não há variável de ambiente nem dado a migrar.
2. Favoritos e `redirect=` antigos para `/minha-conta/senha` continuam funcionando pelo redirect (D1).
3. Rollback: reverter o commit. O front antigo funciona com o backend novo só em parte: o `200` seria ignorado e o usuário cairia no login na requisição seguinte à troca de senha. Por isso, se o back já estiver com o contrato novo, prefira corrigir para a frente.
