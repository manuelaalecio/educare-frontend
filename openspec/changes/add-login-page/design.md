# Design

## Context

- O frontend tem só `__root.tsx` e `index.tsx` do template, TanStack Form, shadcn (`button`, `input`, `label`...) e Vitest com jsdom. Os componentes usam `cn` do pacote `cn`.
- A change `add-backend-integration` planeja a integração com a API e já prevê o `LoginForm` em `src/components/auth/login-form.tsx` e os validadores em `src/integrations/educare-api/validation.ts` (D9 dela). Esta change cria esses arquivos sem nenhuma dependência da API, e a outra liga o formulário à server function `login`.
- Regras do backend para o login: `login` obrigatório com até 254 caracteres (o formato de email não é validado) e `password` obrigatória com até 72 bytes (limite do BCrypt).

## Goals / Non-Goals

**Goals:**
- Página `/login` pronta visualmente, nos temas claro e escuro e em telas de celular.
- Validação no navegador igual à do backend.
- Formulário que a `add-backend-integration` consiga ligar à API sem mexer no layout.

**Non-Goals:**
- Chamar a API, gravar cookie, verificar sessão ao abrir `/login` e tratar o parâmetro `redirect`: ficam na `add-backend-integration`.

## Decisions

### D1. Formulário
`LoginForm` em `src/components/auth/login-form.tsx`, com TanStack Form e os validadores do `loginSchema` (D3). Layout: `Card` centralizado, com o nome "Educare" e os campos com `Label` + `Input` (`type="email"`, `autoComplete="username"` e `type="password"`, `autoComplete="current-password"`). O erro de cada campo aparece logo abaixo dele, e um `Alert` acima dos campos mostra a mensagem devolvida pela ação de envio. O botão "Entrar" usa `form.state.isSubmitting` para ficar desabilitado. Componentes shadcn novos: `card` e `alert`; se o `shadcn add` gerar import de `#/lib/utils`, troca-se por `cn` do pacote `cn`.

### D2. Ação de envio recebida por prop
`LoginForm({ onSubmit })`, com `onSubmit(values: { login: string; password: string }) => Promise<{ message?: string } | undefined>`. Se a ação devolver `message`, ela aparece no `Alert`. Nesta change, a rota passa uma ação provisória que devolve "A entrada no sistema ainda não está disponível." A `add-backend-integration` troca essa ação pela server function `login` e estende o resultado com o que precisar (erros por campo, limpar a senha), sem mudar o layout.

**Alternativa descartada:** uma server function `login` falsa. Ela criaria um contrato que a outra change teria de desfazer, e esta etapa não precisa do servidor.

### D3. Validação
`loginSchema` (Zod) em `src/integrations/educare-api/validation.ts`, o mesmo lugar da D9 da `add-backend-integration`, para reaproveitar no servidor e no futuro CRUD de usuários:
- `login`: `trim`, obrigatório, até 254 caracteres;
- `password`: obrigatória, até 72 bytes (`new TextEncoder().encode(v).length`).

As mensagens de erro ficam em português no próprio schema.

### D4. Rota `/login`
`src/routes/login.tsx` com `head` (título "Entrar · Educare") e o componente que renderiza o `LoginForm` com a ação provisória. Sem `validateSearch` e sem `beforeLoad`: o `redirect` e a verificação de sessão entram com a integração.

### D5. Testes
- Unitários: `loginSchema` (vazio, só espaços, email com 255 caracteres, senha com 72 bytes aceita, 40 `ç` recusada).
- Componente (Testing Library): `LoginForm` com `onSubmit` simulado (`vi.fn`), cobrindo os cenários da spec e a mensagem devolvida pela ação aparecendo no `Alert`.
- Rota: a ação provisória devolve a mensagem de entrada indisponível.
- Manual: `npm run dev`.

## Risks / Trade-offs

- [A `/login` fica acessível sem funcionar] → a mensagem provisória explica, e a `/` continua igual. A página só vai para produção junto com a integração, se preferível.
- [Requisitos de login nas duas changes] → a `add-backend-integration` altera "Página de login" (MODIFIED, tirando a ação provisória) e mantém a parte da API em "Login com email e senha". Para o MODIFIED funcionar, esta change precisa ser arquivada antes da outra.
- [O formato do resultado de `onSubmit` pode precisar crescer] → a outra change estende o tipo; o layout não muda.

## Migration Plan

Sem migração. Para desenvolver: `npm run dev`. Rollback: reverter o commit.
