# Spec Delta

## ADDED Requirements

### Requirement: Dados de turmas reaproveitados e atualizados sem recarregar
A lista de turmas SHALL ser reaproveitada por 5 minutos: voltar a `/configuracoes/turmas` dentro desse prazo, sem nenhuma gravação no meio, SHALL mostrar a lista na hora, sem marcadores de carregamento e sem nova chamada. Depois de 5 minutos, a lista guardada SHALL aparecer na hora e ser atualizada em segundo plano. Ao abrir ou recarregar diretamente `/configuracoes/turmas`, a página SHALL chegar do servidor já com a lista, sem marcadores de carregamento, e o navegador SHALL NOT repetir a chamada.

Abaixo do subtítulo, a aba SHALL mostrar "Atualizado agora" quando a lista tem menos de 1 minuto e "Atualizado há N min" depois disso, e o botão "Atualizar", que busca de novo só a lista de turmas e fica desabilitado enquanto ela é buscada.

Depois de criar, renomear ou excluir uma turma com sucesso (ou de receber `404` ao renomear ou excluir), a lista de turmas SHALL ser buscada de novo, e as outras consultas SHALL NOT ser buscadas de novo, com uma exceção: renomear SHALL fazer as páginas de crianças mostrarem o nome novo da turma na próxima vez que forem abertas. Uma gravação que falha por outro motivo SHALL NOT provocar nenhuma nova busca.

#### Scenario: Voltar à aba sem nova chamada
- **WHEN** a coordenadora abre `/configuracoes/turmas`, vai para o Início e volta em menos de 5 minutos, sem gravar nada
- **THEN** a lista aparece na hora, sem marcadores de carregamento e sem nova chamada à API

#### Scenario: Recarregar a aba
- **WHEN** a coordenadora aperta F5 em `/configuracoes/turmas`
- **THEN** a página chega do servidor já com a lista, sem marcadores de carregamento, e o navegador não faz nova chamada para a lista

#### Scenario: Renomear não busca usuários
- **WHEN** as listas de turmas e de usuários já foram abertas, e a coordenadora renomeia "Turma 1" para "Maternal A"
- **THEN** só a lista de turmas é buscada de novo, e a de usuários não

#### Scenario: Nome novo nas crianças
- **WHEN** a coordenadora abriu `/criancas`, renomeia "Turma 1" para "Maternal A" em Configurações › Turmas e volta a `/criancas`
- **THEN** as crianças da turma aparecem com "Maternal A", sem recarregar a página

#### Scenario: Atualizar a lista
- **WHEN** a lista de turmas foi buscada há 3 minutos e mostra "Atualizado há 3 min", e a coordenadora clica em "Atualizar"
- **THEN** só a lista de turmas é buscada de novo, e o texto passa a "Atualizado agora"

#### Scenario: Nome duplicado não busca de novo
- **WHEN** a coordenadora tenta criar "Turma 1", que já existe, e a API responde `409`
- **THEN** nenhuma consulta é buscada de novo
