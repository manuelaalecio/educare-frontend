# Spec Delta

## ADDED Requirements

### Requirement: Cache curto no servidor do frontend
O servidor do frontend SHALL guardar por até 30 segundos as respostas de sucesso das leituras de turmas, usuários e crianças (listas, detalhes e histórico de turmas), em memória, e SHALL responder do que guardou, sem chamar a API, quando a mesma sessão repetir a mesma leitura nesse prazo. Respostas de erro SHALL NOT ser guardadas. `GET /api/v1/auth/me` SHALL NOT ser respondido do cache em nenhum caso.

As entradas SHALL ficar separadas por sessão: uma sessão SHALL NOT receber dados guardados a partir de outra sessão, nem de outro usuário. A separação SHALL usar o token completo da sessão, e não um dado lido de dentro dele sem a API conferir. O token e os dados guardados SHALL NOT aparecer em log. O cache SHALL guardar no máximo 500 entradas e, quando passar disso, SHALL descartar a usada há mais tempo. Nada do cache SHALL ser gravado em disco, nem enviado a outro serviço; ele SHALL sumir quando a instância do servidor reinicia.

Uma gravação bem-sucedida de turma, usuário ou criança que passa pelo servidor do frontend SHALL descartar, para todas as sessões, as entradas dos recursos que ela afeta (as mesmas que o navegador busca de novo). Uma gravação que encontra o registro já excluído (`404`) SHALL descartar também. O logout, a troca da própria senha e um `401` da API SHALL descartar as entradas da sessão envolvida. Cada resposta servida do cache SHALL gerar no log do servidor uma linha com o recurso, sem chave, filtros, id nem dados.

Quando houver mais de uma instância do servidor, cada uma SHALL ter o próprio cache; uma gravação feita por outra instância pode levar até 30 segundos para aparecer.

O botão "Atualizar" das listas também passa por esse cache: dentro dos 30 segundos, ele SHALL receber o que a sessão já tem guardado, mesmo mostrando "Atualizado agora" (dívida técnica aceita; veja o design).

#### Scenario: F5 repetido na lista
- **WHEN** a coordenadora está em `/configuracoes/usuarios` e aperta F5 10 vezes em 30 segundos, todas atendidas pela mesma instância
- **THEN** a API recebe 10 chamadas a `GET /api/v1/auth/me` e no máximo 1 a `GET /api/v1/users`

#### Scenario: Sessões separadas
- **WHEN** a coordenadora Ana abre a lista de usuários, e em seguida o coordenador Bruno, em outro navegador, abre a mesma lista
- **THEN** a API recebe a chamada da lista também com o token de Bruno, e Bruno não recebe nada guardado a partir da sessão de Ana

#### Scenario: Gravação de outra pessoa
- **WHEN** a lista de turmas está guardada para Ana, Bruno cria a "Turma 5" pela mesma instância, e Ana aperta F5 em `/configuracoes/turmas`
- **THEN** a API recebe de novo a chamada da lista para Ana, e Ana vê "Turma 5"

#### Scenario: Gravação que falha
- **WHEN** a lista de turmas está guardada, e uma tentativa de criar "Turma 1" recebe `409`
- **THEN** a lista guardada continua valendo, e a próxima leitura dentro dos 30 segundos não chama a API

#### Scenario: Prazo vencido
- **WHEN** a lista de crianças foi guardada há 31 segundos, e a mesma sessão pede a mesma lista
- **THEN** o servidor do frontend chama a API de novo

#### Scenario: Atualizar dentro dos 30 segundos
- **WHEN** a lista de turmas foi guardada há 10 segundos para Ana, uma turma é criada por outra instância do servidor (ou direto na API), e Ana clica em "Atualizar"
- **THEN** o servidor do frontend responde com a lista guardada, sem chamar a API, e a turma nova só aparece num "Atualizar" feito depois dos 30 segundos

#### Scenario: Erro não é guardado
- **WHEN** a API responde `500` à lista de turmas, e a mesma sessão clica em "Tentar de novo"
- **THEN** o servidor do frontend chama a API de novo

#### Scenario: Sessão revogada
- **WHEN** a usuária troca a própria senha num navegador, e no outro, com o token antigo, aperta F5
- **THEN** o `GET /api/v1/auth/me` é chamado, recebe `401`, e ela é levada ao login sem ver dados guardados

#### Scenario: Log sem dados
- **WHEN** a lista de crianças com o filtro `nome=joao` é servida do cache
- **THEN** o log do servidor tem uma linha com o recurso de crianças, sem "joao", sem o token e sem nenhum dado de criança

### Requirement: Limite de requisições informado
Quando a API responder `429` a uma leitura ou gravação, a interface SHALL mostrar "Muitas requisições. Aguarde um instante." no lugar onde mostraria o erro dessa ação (o alerta da lista, com "Tentar de novo", ou o alerta do modal ou formulário, que continua aberto), e a sessão SHALL continuar ativa. A troca da própria senha SHALL continuar mostrando "Muitas tentativas. Tente novamente em alguns minutos." no `429`. Um `429` SHALL NOT disparar novas tentativas automáticas.

#### Scenario: Lista com limite atingido
- **WHEN** a coordenadora abre `/configuracoes/turmas` e a API responde `429` à lista
- **THEN** a aba mostra "Muitas requisições. Aguarde um instante." e o botão "Tentar de novo", e ela continua logada

#### Scenario: Depois da janela
- **WHEN** a aba mostra "Muitas requisições. Aguarde um instante.", a janela do limite passa, e a coordenadora clica em "Tentar de novo"
- **THEN** a lista de turmas aparece

#### Scenario: Gravação com limite atingido
- **WHEN** a coordenadora clica em "Criar usuário" com campos válidos e a API responde `429`
- **THEN** o modal continua aberto com o alerta "Muitas requisições. Aguarde um instante."

#### Scenario: Troca de senha mantém a mensagem própria
- **WHEN** a usuária envia a troca de senha e a API responde `429`
- **THEN** o modal mostra "Muitas tentativas. Tente novamente em alguns minutos."
