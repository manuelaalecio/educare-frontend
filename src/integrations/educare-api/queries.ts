import {
	type FetchQueryOptions,
	keepPreviousData,
	type QueryClient,
	type QueryKey,
	queryOptions,
} from '@tanstack/react-query'
import { isNotFound, isRedirect } from '@tanstack/react-router'
import type { ChildrenFilters } from './children'
import {
	getChild,
	getChildClassrooms,
	getChildren,
	getClassrooms,
	getCurrentUser,
	getUsers,
} from './functions'
import { childIdSchema } from './validation'

/**
 * Filtros da lista de crianças, como na URL (`pagina` começa em 1). Nunca
 * dados de saúde ou documentos: a chave fica no cache e no HTML do SSR.
 * É o mesmo tipo que `listChildren` recebe.
 */
export type ChildFilters = ChildrenFilters

/**
 * Chaves das consultas da API. Invalidar uma chave invalida também as que
 * começam com ela: `keys.children` pega lista, detalhes e histórico.
 */
export const keys = {
	session: ['educare-api', 'session'],
	classrooms: ['educare-api', 'classrooms'],
	users: ['educare-api', 'users'],
	children: ['educare-api', 'children'],
	childList: (filters: ChildFilters) =>
		[...keys.children, 'list', filters] as const,
	child: (id: string) => [...keys.children, 'detail', id] as const,
	childClassrooms: (id: string) => [...keys.child(id), 'classrooms'] as const,
} as const

// Navegações internas reaproveitam a sessão por 5 minutos; um carregamento
// completo (SSR) sempre chama `/auth/me`.
export const currentUserQuery = queryOptions({
	queryKey: keys.session,
	queryFn: () => getCurrentUser(),
	staleTime: 5 * 60_000,
})

// Lista de turmas de Configurações › Turmas. Buscada no navegador (sem
// `loader`): a aba mostra o skeleton e trata o erro com "Tentar de novo".
export const classroomsQuery = queryOptions({
	queryKey: keys.classrooms,
	queryFn: async () => {
		const result = await getClassrooms()
		if (!result.ok) throw new Error(result.message)
		return result.classrooms
	},
	staleTime: 5 * 60_000,
	// Sem novas tentativas automáticas: com o timeout de 10 s da API, o erro
	// demoraria quase um minuto; a aba oferece "Tentar de novo".
	retry: false,
})

// Lista de Configurações › Usuários, uma página por vez (começando em 1).
// Buscada no navegador, como a de turmas. A página anterior continua na tela
// enquanto a próxima carrega.
export const usersQueryKey = keys.users

export const usersQuery = (page: number) =>
	queryOptions({
		queryKey: [...keys.users, page],
		queryFn: async () => {
			const result = await getUsers({ data: { page } })
			if (!result.ok) throw new Error(result.message)
			return { users: result.users, page: result.page }
		},
		placeholderData: keepPreviousData,
		retry: false,
	})

// Crianças: carregadas no `loader` com `loadQuery` (SSR) e guardadas por
// 1 minuto. Sem novas tentativas automáticas, como as demais: a tela oferece
// "Tentar de novo".
const CHILDREN_STALE_TIME = 60_000

/** Uma página da lista; a anterior continua na tela enquanto a próxima carrega. */
export const childrenQuery = (filters: ChildFilters) =>
	queryOptions({
		queryKey: keys.childList(filters),
		queryFn: async () => {
			const result = await getChildren({ data: filters })
			if (!result.ok) throw new Error(result.message)
			return { children: result.children, page: result.page }
		},
		staleTime: CHILDREN_STALE_TIME,
		placeholderData: keepPreviousData,
		retry: false,
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
		staleTime: CHILDREN_STALE_TIME,
		retry: false,
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
		staleTime: CHILDREN_STALE_TIME,
		retry: false,
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
