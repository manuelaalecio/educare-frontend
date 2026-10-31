import { queryOptions } from '@tanstack/react-query'
import { getClassrooms, getCurrentUser } from './functions'

// Navegações internas reaproveitam a sessão por 5 minutos; um carregamento
// completo (SSR) sempre chama `/auth/me`.
export const currentUserQuery = queryOptions({
	queryKey: ['educare-api', 'session'],
	queryFn: () => getCurrentUser(),
	staleTime: 5 * 60_000,
})

// Lista de turmas de Configurações › Turmas. Buscada no navegador (sem
// `loader`): a aba mostra o skeleton e trata o erro com "Tentar de novo".
export const classroomsQuery = queryOptions({
	queryKey: ['educare-api', 'classrooms'],
	queryFn: async () => {
		const result = await getClassrooms()
		if (!result.ok) throw new Error(result.message)
		return result.classrooms
	},
	// Sem novas tentativas automáticas: com o timeout de 10 s da API, o erro
	// demoraria quase um minuto; a aba oferece "Tentar de novo".
	retry: false,
})
