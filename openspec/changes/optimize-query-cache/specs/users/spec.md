# Spec Delta

## ADDED Requirements

### Requirement: Dados de usuários reaproveitados e atualizados sem recarregar
Cada página da lista de usuários SHALL ser reaproveitada por 1 minuto: voltar a ela dentro desse prazo, sem nenhuma gravação no meio, SHALL mostrar a lista na hora, sem marcadores de carregamento e sem nova chamada. Depois de 1 minuto, a página guardada SHALL aparecer na hora e ser atualizada em segundo plano. Ao abrir ou recarregar diretamente `/configuracoes/usuarios` (com o `?pagina=N` do endereço), a página SHALL chegar do servidor já com a lista, sem marcadores de carregamento, e o navegador SHALL NOT repetir a chamada. Ao trocar de página na própria aba, a página anterior SHALL continuar na tela até a nova chegar.

Abaixo do subtítulo, a aba SHALL mostrar "Atualizado agora" quando a página mostrada tem menos de 1 minuto e "Atualizado há N min" depois disso, e o botão "Atualizar", que busca de novo só a página mostrada e fica desabilitado enquanto ela é buscada.

Depois de criar, editar, redefinir a senha ou excluir um usuário com sucesso (ou de receber `404` ao editar, redefinir ou excluir), a lista de usuários (todas as páginas) SHALL ser buscada de novo na próxima vez que for mostrada, e as outras consultas SHALL NOT ser buscadas de novo, exceto a sessão quando o usuário editado for o da sessão. Uma gravação que falha por outro motivo SHALL NOT provocar nenhuma nova busca.

#### Scenario: Voltar à aba sem nova chamada
- **WHEN** a coordenadora abre `/configuracoes/usuarios`, vai para a aba Turmas e volta em menos de 1 minuto, sem gravar nada
- **THEN** a lista de usuários aparece na hora, sem marcadores de carregamento e sem nova chamada à API

#### Scenario: Recarregar a segunda página
- **WHEN** existem 25 usuários e a coordenadora aperta F5 em `/configuracoes/usuarios?pagina=2`
- **THEN** a página chega do servidor já com "Mostrando 21–25 de 25", sem marcadores de carregamento, e o navegador não faz nova chamada para a lista

#### Scenario: Criar usuário não busca turmas
- **WHEN** as listas de turmas e de usuários já foram abertas, e a coordenadora cria "Mariana Alves"
- **THEN** só a lista de usuários é buscada de novo, e a de turmas não

#### Scenario: Atualizar a página mostrada
- **WHEN** a página 2 foi buscada há 2 minutos e mostra "Atualizado há 2 min", e a coordenadora clica em "Atualizar"
- **THEN** só a página 2 é buscada de novo, e o texto passa a "Atualizado agora"

#### Scenario: Email duplicado não busca de novo
- **WHEN** a coordenadora tenta criar um usuário com um email já cadastrado, e a API responde `409`
- **THEN** nenhuma consulta é buscada de novo
