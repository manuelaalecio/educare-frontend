# Tasks

## 1. Validação

- [x] 1.1 Criar `src/integrations/educare-api/validation.ts` com o `loginSchema` (D3). Testes unitários: campos vazios e só com espaços, email com 255 caracteres, senha com 72 bytes (aceita) e com 40 `ç` (80 bytes, recusada)

## 2. Página de login

- [x] 2.1 Rodar `npx shadcn@latest add card alert` e ajustar os imports para `cn` do pacote `cn` se preciso. Verificar com `npm run typecheck` e `npm run check`
- [x] 2.2 Criar `src/components/auth/login-form.tsx` (D1, D2) com testes de Testing Library e `onSubmit` simulado: "Página exibida" (campos, botão, sem link de cadastro), "Campos vazios", "Campos só com espaços", "Email longo demais" e "Senha acima de 72 bytes" (ação não chamada), "Envio em andamento" (botão desabilitado, uma só chamada) e mensagem devolvida pela ação aparecendo no `Alert`
- [x] 2.3 Criar `src/routes/login.tsx` (D4) com `head` ("Entrar · Educare") e a ação provisória. Teste de "Entrada ainda indisponível" (a ação devolve "A entrada no sistema ainda não está disponível."). Verificar que `npm run dev` gera a rota em `routeTree.gen.ts` sem editá-lo à mão

## 3. Verificação

- [ ] 3.1 Com `npm run dev`, abrir `/login` e conferir: layout nos temas claro e escuro e em largura de celular, erros dos campos vazios e da senha longa, botão desabilitado durante o envio e a mensagem provisória. No DevTools, confirmar que nenhuma requisição vai para `localhost:8080`
- [x] 3.2 Rodar `npm run check -- --write`, `npm run typecheck` e `npm test` e verificar que os três terminam sem erro
