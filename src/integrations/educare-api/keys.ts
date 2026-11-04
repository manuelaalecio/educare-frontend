import type { ChildrenFilters } from './children'

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
