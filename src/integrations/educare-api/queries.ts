import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { getClassrooms, getCurrentUser, getUsers } from './functions'

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

// Lista de Configurações › Usuários, uma página por vez (começando em 1).
// Buscada no navegador, como a de turmas. A página anterior continua na tela
// enquanto a próxima carrega.
export const usersQueryKey = ['educare-api', 'users'] as const

export const usersQuery = (page: number) =>
	queryOptions({
		queryKey: [...usersQueryKey, page],
		queryFn: async () => {
			const result = await getUsers({ data: { page } })
			if (!result.ok) throw new Error(result.message)
			return { users: result.users, page: result.page }
		},
		placeholderData: keepPreviousData,
		retry: false,
	})
