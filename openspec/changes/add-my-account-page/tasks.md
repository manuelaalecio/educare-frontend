# Tasks

## 1. Contrato da API e erros

- [x] 1.1 Regenerar `src/integrations/educare-api/schema.gen.ts` com `npm run api:generate` (ou `API_CONTRACT=../educare-backend/openapi/educare-api.json npm run api:generate`, se o contrato novo ainda só existir no back local), sem editar o arquivo à mão (D7). Verificar com `git diff` que `changeOwnPassword` passou a ter `200` com `AccessTokenResponse` e `429` com `ProblemDetail`. Se o back ainda não tiver o contrato, marcar como bloqueada e seguir com os grupos 2 a 5; a 3.1 espera esta
- [x] 1.2 Em `errors.ts`, adicionar o kind `'too-many-requests'`, mapear `429` para ele com ou sem `ProblemDetail` e fazer `messageFor` devolver `messages.tooManyAttempts`; em `messages.ts`, adicionar `tooManyAttempts` ("Muitas tentativas. Tente novamente em alguns minutos.") e trocar `passwordChanged` por "Senha alterada. Outros dispositivos foram desconectados." (D8). Testes unitários em `errors.test.ts`: `429` com `ProblemDetail`, `429` sem corpo, e `toFormError` com a mensagem fixa. Verificar com `npm test`

## 2. Sessão com a data de cadastro

- [x] 2.1 Incluir `createdAt` em `CurrentUser` e copiá-lo em `fetchSession` (`auth.ts`) (D2). Atualizar os mocks de usuário dos testes que montam `CurrentUser` e acrescentar em `auth.test.ts` a checagem de que `fetchSession` devolve `createdAt`. Verificar com `npm run typecheck` e `npm test`
- [x] 2.2 Criar `memberSince(createdAt)` em `src/components/layout/user.ts` com `Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })` (D3), com testes unitários em `user.test.ts`: "março de 2026" para `2026-03-12T14:00:00Z` e "outubro de 2026" para `2026-11-01T01:30:00Z`. Verificar com `npm test`

## 3. Token novo na troca de senha

- [x] 3.1 Fazer `performChangePassword` receber `cookies: Pick<SessionCookies, 'set'>` e gravar `accessToken`/`expiresIn` quando a resposta os trouxer, sem mexer no cookie numa resposta sem corpo; injetar `requestCookies` em `changeOwnPassword` (`functions.ts`) (D7). Testes unitários em `auth.test.ts`: `200` chama `cookies.set(token, 28800)`, `204` não chama, `400` devolve `fieldErrors`, `429` devolve a mensagem de muitas tentativas, `401` relança. Verificar com `npm test` e `npm run typecheck`

## 4. Componentes do modal

- [x] 4.1 Rodar `npx shadcn@latest add dialog`, trocar `import * as React` por imports nomeados e o import de utilitários por `cn` (D4). Verificar com `git status` que só surgiu `src/components/ui/dialog.tsx`, e com `npm run check -- --write` e `npm run typecheck`
- [x] 4.2 Criar `src/components/auth/password-input.tsx` com o `Input` e o botão mostrar/ocultar (`Eye`/`EyeOff`, nomes "Mostrar <rótulo>"/"Ocultar <rótulo>", `type='button'`) (D6). Verificar com o cenário "Mostrar a senha" no teste de 5.2
- [x] 4.3 Adaptar `src/components/auth/change-password-form.tsx` (D5, D6, D11): sem `Card` e sem toast; props `onSubmit`, `onSuccess` e `onCancel`; campos com `PasswordInput` e os rótulos "Senha atual", "Nova senha" e "Confirmar nova senha"; dica de "Nova senha" com `id` próprio e `aria-describedby` com a dica e o erro; alerta geral no topo; aviso "Você continua conectado aqui. Os outros dispositivos precisarão entrar de novo com a nova senha."; rodapé com "Cancelar" e "Alterar senha", ambos desabilitados durante o envio; expor `isSubmitting` ao pai (por callback) para o D5; `ref` em "Senha atual" para o foco inicial. Verificar com o teste de 5.2

## 5. Página Minha conta e redirect

- [x] 5.1 Criar `src/routes/_authenticated/minha-conta/index.tsx` (D1, D2, D3, D10) com `head` "Minha conta · Educare", `h1` "Minha conta", "Seus dados de acesso ao Educare.", card de perfil (avatar com `initials`, `h2` com o nome, selo com `roleLabel`, `<dl>` com "Email de acesso", "Função" e "Membro desde" via `memberSince`, nota "Nome, email e função são alterados por um administrador, em Configurações.") e card "Senha" com o texto e o `DialogTrigger` "Alterar senha". Verificar com o teste de 5.2 e com `npm run dev` regenerando `routeTree.gen.ts` sem edição à mão
- [x] 5.2 Ligar o modal na página (D4, D5, D6): `Dialog` com `open` em estado, `DialogTitle` "Alterar senha", `DialogDescription` "Confirme sua senha atual e escolha uma nova.", `onOpenAutoFocus` focando "Senha atual", fechamento bloqueado durante o envio (`onOpenChange`, `onEscapeKeyDown`, `onInteractOutside`), e no `onSuccess` fechar e chamar `toast.success(messages.passwordChanged)`. Criar `src/routes/-my-account.test.tsx` e apagar `-change-password.test.tsx`, cobrindo os cenários "Perfil de um USER", "Perfil de um ADMIN", "Card de senha", "Abrir o modal", "Senha trocada" (modal fecha, toast), "Senha atual incorreta", "Nova senha recusada pela API", "Muitas tentativas", "API indisponível na troca", "Confirmação diferente", "Nova senha curta", "Mostrar a senha", "Cancelar descarta" (Cancelar e `Esc`, foco de volta ao botão) e "Envio em andamento". Verificar com `npm test`
- [x] 5.3 Trocar `src/routes/_authenticated/minha-conta/senha.tsx` por só um `beforeLoad` com `redirect({ to: '/minha-conta', replace: true })` (D1). Em `-authenticated.test.tsx`, testar "URL antiga com sessão" (vai para `/minha-conta`, sem modal aberto), "URL antiga sem sessão" (`/login?redirect=%2Fminha-conta%2Fsenha`) e "Página exige sessão" / "Acesso sem sessão" com `/minha-conta`. Verificar com `npm test`

## 6. Menu do usuário e referências antigas

- [x] 6.1 Em `user-menu.tsx`, apontar "Minha conta" para `/minha-conta`; em `src/testing/render-route.tsx`, trocar o placeholder `/minha-conta/senha` por `/minha-conta` ("Página Minha conta") (D9). Atualizar `user-menu.test.tsx` ("Ir para Minha conta": `href="/minha-conta"` e navegação). Verificar com `npm test`
- [x] 6.2 Trocar `/minha-conta/senha` por `/minha-conta` nos testes que o usam só como exemplo de caminho (`redirect.test.ts`, `session.test.ts`, `-login.test.tsx`, `app-sidebar.test.tsx` "Página fora da barra", `nav-items.test.ts` com "Minha conta" em `/minha-conta`) (D9). Verificar com `grep -rn "minha-conta/senha" src --include=*.ts --include=*.tsx | grep -v routeTree.gen` mostrando só `senha.tsx` e os testes do redirect, e com `npm test`

## 7. Conferência final

- [ ] 7.1 Conferir manualmente, com `npm run dev`, a página e o modal contra as pranchas "Minha conta · desktop", "· alterar senha (modal)", "· celular" (390 px) e "· modo escuro", e a navegação só por teclado no modal (`Tab` preso, `Esc` fecha, foco volta a "Alterar senha") (D4, D10)
- [ ] 7.2 Com o backend com o contrato novo rodando, conferir manualmente: trocar a senha no navegador A e recarregar (continua logado, `educare_session` mudou com `HttpOnly`, `SameSite=Lax` e `Max-Age=28800` no DevTools); no navegador B, a próxima ação leva ao login com "Sua sessão expirou. Entre de novo para continuar."; errar a senha atual 6 vezes mostra "Muitas tentativas. Tente novamente em alguns minutos." (D7, D8)
- [x] 7.3 Rodar `npm run check -- --write`, `npm run typecheck` e `npm test`, e verificar que os três terminam sem erro
