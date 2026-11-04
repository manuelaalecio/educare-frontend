import { describe, expect, it } from 'vitest'
import { invalidates, keysOf, shouldInvalidate } from './invalidation'
import { keys } from './keys'

describe('keysOf', () => {
	it('devolve as chaves de keys para cada tag', () => {
		expect(keysOf(['classrooms', 'users', 'children'])).toEqual([
			keys.classrooms,
			keys.users,
			keys.children,
		])
	})
})

describe('invalidates', () => {
	it('renomear turma invalida as crianças; excluir não', () => {
		expect(invalidates.renameClassroom).toContain('children')
		expect(invalidates.deleteClassroom).not.toContain('children')
		expect(invalidates.createClassroom).toEqual(['classrooms'])
	})

	it('gravações de usuário invalidam só usuários', () => {
		for (const name of [
			'createUser',
			'updateUser',
			'resetUserPassword',
			'deleteUser',
		] as const) {
			expect(invalidates[name]).toEqual(['users'])
		}
	})

	it('gravações de criança invalidam crianças e turmas', () => {
		for (const name of ['createChild', 'updateChild', 'deleteChild'] as const) {
			expect(invalidates[name]).toEqual(['children', 'classrooms'])
		}
	})
})

describe('shouldInvalidate', () => {
	it('invalida no sucesso e no 404, não nos outros erros', () => {
		expect(shouldInvalidate({ ok: true })).toBe(true)
		expect(shouldInvalidate({ ok: false, kind: 'not-found' })).toBe(true)
		expect(shouldInvalidate({ ok: false, kind: 'conflict' })).toBe(false)
		expect(shouldInvalidate({ ok: false, kind: 'unavailable' })).toBe(false)
	})
})
