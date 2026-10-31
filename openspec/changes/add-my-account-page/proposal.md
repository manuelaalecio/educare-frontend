# Proposal

## Why

Hoje "Minha conta" é só a página `/minha-conta/senha`, um formulário solto que não diz com qual conta o usuário está logado. A tarefa [Página Minha conta com troca de senha em modal](https://app.clickup.com/t/1dfh60pgyz9) (subtarefa de front [Página /minha-conta e modal de troca de senha](https://app.clickup.com/t/1dfh60pgyzb)) cria uma página de perfil e leva a troca de senha para um modal. Ao mesmo tempo, o backend passa a desconectar as outras sessões na troca de senha e a devolver um token novo para a sessão atual. Se o front não gravar esse token, o próprio usuário cai no login logo depois de trocar a senha.

## What Changes

- Nova página protegida `/minha-conta` (título de aba "Minha conta · Educare"), só para leitura: avatar com as iniciais, nome, função ("Administrador"/"Funcionário"), email de acesso e "Membro desde <mês> de <ano>", com dados de `GET /api/v1/auth/me`.
- Card "Senha" com o botão "Alterar senha", que abre o modal "Alterar senha" com "Senha atual", "Nova senha" e "Confirmar nova senha". Cada campo tem o botão de mostrar/ocultar, e a dica "De 8 a 72 caracteres, diferente da senha atual e do seu email." aparece sob "Nova senha" desde o início.
- Sucesso: o modal fecha, os campos são limpos e aparece o toast "Senha alterada. Outros dispositivos foram desconectados.". Erro: o modal continua aberto, com o erro no campo (`400`) ou num alerta (`429` com "Muitas tentativas. Tente novamente em alguns minutos." e erros gerais). "Cancelar", `Esc` e clique fora fecham e descartam o que foi digitado.
- O servidor do front grava no cookie de sessão o `accessToken` devolvido pelo novo `200` de `PUT /api/v1/auth/me/password`, para a sessão atual continuar ativa.
- O `429` vira um tipo de erro da integração com a API, com mensagem própria.
- **BREAKING**: a página `/minha-conta/senha` deixa de existir como formulário. A URL passa a redirecionar para `/minha-conta`, sem abrir o modal.
- O item "Minha conta" do menu do usuário passa a levar a `/minha-conta`.
- `GET /auth/me` passa a ser lido também com `createdAt`, para o "Membro desde".
- Novo componente `Dialog` do shadcn em `src/components/ui/dialog.tsx`.

## Non-goals

- Editar nome, email ou foto (a página diz que isso é feito por um administrador, em Configurações).
- Listar ou encerrar sessões manualmente.
- "Esqueci minha senha" ou recuperação por email.
- Regras do backend (invalidar tokens antigos, senha diferente da atual e do email, limite de tentativas): ficam na subtarefa de back. O front só mostra os erros que a API devolve.
- Validar no front que a nova senha é diferente da atual ou do email. A dica avisa, e a API decide.
- A tela de Configurações → Usuários e a redefinição de senha pelo admin.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `auth`: o requisito "Trocar a própria senha" passa a descrever o modal da página `/minha-conta`, o token novo gravado no cookie e o `429`; entra o requisito da página "Minha conta" e o redirecionamento de `/minha-conta/senha`; os cenários que usam `/minha-conta/senha` como exemplo passam a usar `/minha-conta`.
- `app-layout`: o item "Minha conta" do menu do usuário leva a `/minha-conta`; o título "Minha conta" do cabeçalho e o cenário de página fora da barra lateral passam a citar `/minha-conta`.

## Impact

- **Código**: `src/routes/_authenticated/minha-conta/index.tsx` (novo) e `senha.tsx` (vira redirect); `src/components/auth/change-password-form.tsx` (vira o conteúdo do modal) e um novo componente da página; `src/components/ui/dialog.tsx` (novo, shadcn); `src/integrations/educare-api/auth.ts`, `functions.ts`, `errors.ts`, `messages.ts`; `src/components/layout/user-menu.tsx`; `src/testing/render-route.tsx` e os testes que citam `/minha-conta/senha`.
- **API**: depende do novo contrato de `PUT /api/v1/auth/me/password` (`200` com `AccessTokenResponse` e `429` com `ProblemDetail`) e da regeneração de `schema.gen.ts` com `npm run api:generate`.
- **Ordem e sobreposição**: não há outra change em andamento neste repositório. No `educare-backend`, a subtarefa [Invalidar sessões na troca de senha e endurecer regras](https://app.clickup.com/t/1dfh60pgyza) ainda não tem change, e o contrato publicado ainda responde `204`. Esta change deve ser aplicada depois que o contrato novo estiver publicado; até lá, o front aceita também o `204` (ver design), então pode ir para produção antes do back sem quebrar a troca de senha. A change `add-child-crud`, em andamento no backend, não toca em autenticação.
- **Dependências**: nenhuma nova (o `Dialog` usa o `radix-ui` que já está instalado).
