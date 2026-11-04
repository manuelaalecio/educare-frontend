import type { QueryKey } from '@tanstack/react-query'
import { keys } from './keys'

/** Recursos da API que uma gravação pode deixar velhos. */
export type Tag = 'classrooms' | 'users' | 'children'

/**
 * O que cada gravação deixa velho, num só lugar: o navegador invalida as
 * chaves (`meta.invalidates`) e o servidor do front limpa as mesmas tags do
 * cache dele. Invalidar uma tag pega todas as consultas daquele recurso.
 */
export const invalidates = {
	createClassroom: ['classrooms'],
	// O nome da turma aparece na lista e nos detalhes das crianças.
	renameClassroom: ['classrooms', 'children'],
	// Só se exclui turma sem crianças e sem histórico: nenhuma criança a mostra.
	deleteClassroom: ['classrooms'],
	createUser: ['users'],
	updateUser: ['users'],
	resetUserPassword: ['users'],
	deleteUser: ['users'],
	// As contagens das turmas mudam.
	createChild: ['children', 'classrooms'],
	updateChild: ['children', 'classrooms'],
	deleteChild: ['children', 'classrooms'],
} as const satisfies Record<string, readonly Tag[]>

/** Chaves do TanStack Query das tags: `classrooms` → `keys.classrooms`. */
export function keysOf(tags: readonly Tag[]): QueryKey[] {
	return tags.map((tag) => keys[tag])
}

/**
 * Uma gravação deixa os dados velhos quando dá certo e também quando o
 * registro já não existia (`404`): a lista precisa perder a linha.
 */
export function shouldInvalidate(
	result: { ok: true } | { ok: false; kind: string },
): boolean {
	return result.ok || result.kind === 'not-found'
}
