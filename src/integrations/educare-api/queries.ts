import {
	type FetchQueryOptions,
	keepPreviousData,
	type QueryClient,
	type QueryKey,
	queryOptions,
} from '@tanstack/react-query'
import { isNotFound, isRedirect } from '@tanstack/react-router'
import {
	getChild,
	getChildClassrooms,
	getChildren,
	getClassrooms,
	getCurrentUser,
	getUsers,
} from './functions'
import { type ChildFilters, keys } from './keys'
import { childIdSchema } from './validation'

export { type ChildFilters, keys } from './keys'

/**
 * Por quanto tempo cada tipo de dado é reaproveitado sem nova chamada. Depois
 * disso, os dados guardados aparecem na hora e são atualizados em segundo plano.
 * Sem novas tentativas automáticas (`defaultOptions` do `QueryClient`): com o
 * timeout de 10 s da API, o erro demoraria quase um minuto; a tela oferece
 * "Tentar de novo".
 */
export const staleTimes = {
	session: 5 * 60_000,
	classrooms: 5 * 60_000,
	users: 60_000,
	children: 60_000,
} as const

// Navegações internas reaproveitam a sessão por 5 minutos; um carregamento
// completo (SSR) sempre chama `/auth/me`.
export const currentUserQuery = queryOptions({
	queryKey: keys.session,
	queryFn: () => getCurrentUser(),
	staleTime: staleTimes.session,
})

// Lista de turmas de Configurações › Turmas, do filtro de crianças e do
// formulário de criança.
export const classroomsQuery = queryOptions({
	queryKey: keys.classrooms,
	queryFn: async () => {
		const result = await getClassrooms()
		if (!result.ok) throw new Error(result.message)
		return result.classrooms
	},
	staleTime: staleTimes.classrooms,
})

// Lista de Configurações › Usuários, uma página por vez (começando em 1). A
// página anterior continua na tela enquanto a próxima carrega.
export const usersQuery = (page: number) =>
	queryOptions({
		queryKey: [...keys.users, page],
		queryFn: async () => {
			const result = await getUsers({ data: { page } })
			if (!result.ok) throw new Error(result.message)
			return { users: result.users, page: result.page }
		},
		staleTime: staleTimes.users,
		placeholderData: keepPreviousData,
	})

// Crianças: carregadas no `loader` com `loadQuery` (SSR).

/** Uma página da lista; a anterior continua na tela enquanto a próxima carrega. */
export const childrenQuery = (filters: ChildFilters) =>
	queryOptions({
		queryKey: keys.childList(filters),
		queryFn: async () => {
			const result = await getChildren({ data: filters })
			if (!result.ok) throw new Error(result.message)
			return { children: result.children, page: result.page }
		},
		staleTime: staleTimes.children,
		placeholderData: keepPreviousData,
	})

/** `null` quando a criança não existe, ou quando o id nem é um UUID (sem chamar a API). */
export const childQuery = (id: string) =>
	queryOptions({
		queryKey: keys.child(id),
		queryFn: async () => {
			if (!childIdSchema.safeParse({ id }).success) return null
			const result = await getChild({ data: { id } })
			if (!result.ok) throw new Error(result.message)
			return result.child
		},
		staleTime: staleTimes.children,
	})

/** Histórico de turmas, do período mais recente para o mais antigo. */
export const childClassroomsQuery = (id: string) =>
	queryOptions({
		queryKey: keys.childClassrooms(id),
		queryFn: async () => {
			const result = await getChildClassrooms({ data: { id } })
			if (!result.ok) throw new Error(result.message)
			return result.periods
		},
		staleTime: staleTimes.children,
	})

/**
 * Carrega uma consulta no `loader` de uma rota.
 *
 * - Sem dados, ou com a consulta invalidada (depois de uma gravação), espera a
 *   busca: a página só aparece com os dados novos.
 * - Com dados, mesmo vencidos, devolve na hora; o `useQuery` do componente
 *   atualiza em segundo plano.
 * - Um erro da busca não é lançado: a consulta fica em erro e o componente
 *   mostra a mensagem com "Tentar de novo". Só o redirecionamento da sessão
 *   expirada (e o `notFound()`) seguem para o router.
 */
export async function loadQuery<
	TQueryFnData,
	TError,
	TData,
	TQueryKey extends QueryKey,
>(
	queryClient: QueryClient,
	options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): Promise<void> {
	const state = queryClient.getQueryState(options.queryKey)
	try {
		if (state?.data === undefined || state.isInvalidated) {
			await queryClient.fetchQuery(options)
		} else {
			await queryClient.ensureQueryData(options)
		}
	} catch (error) {
		if (isRedirect(error) || isNotFound(error)) throw error
	}
}
