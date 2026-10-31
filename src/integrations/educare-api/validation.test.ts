import { describe, expect, it } from 'vitest'
import {
	changePasswordSchema,
	classroomNameSchema,
	loginSchema,
	renameClassroomSchema,
} from './validation'

function errorPaths(input: { login: string; password: string }) {
	const result = loginSchema.safeParse(input)
	return result.success ? [] : result.error.issues.map((issue) => issue.path[0])
}

describe('loginSchema', () => {
	it('recusa os dois campos vazios', () => {
		expect(errorPaths({ login: '', password: '' })).toEqual([
			'login',
			'password',
		])
	})

	it('recusa o email só com espaços', () => {
		expect(errorPaths({ login: '   ', password: '' })).toEqual([
			'login',
			'password',
		])
	})

	it('tira os espaços das pontas do email', () => {
		const result = loginSchema.parse({
			login: '  admin@educare.org ',
			password: 'educare123',
		})
		expect(result.login).toBe('admin@educare.org')
	})

	it('recusa o email com 255 caracteres', () => {
		const login = `${'a'.repeat(243)}@educare.org`
		expect(login).toHaveLength(255)
		expect(errorPaths({ login, password: 'educare123' })).toEqual(['login'])
	})

	it('aceita o email com 254 caracteres', () => {
		const login = `${'a'.repeat(242)}@educare.org`
		expect(errorPaths({ login, password: 'educare123' })).toEqual([])
	})

	it('aceita a senha com 72 bytes', () => {
		expect(
			errorPaths({ login: 'admin@educare.org', password: 'a'.repeat(72) }),
		).toEqual([])
	})

	it('recusa a senha com 40 ç (80 bytes)', () => {
		expect(
			errorPaths({ login: 'admin@educare.org', password: 'ç'.repeat(40) }),
		).toEqual(['password'])
	})
})

describe('changePasswordSchema', () => {
	const valid = {
		currentPassword: 'segredo123',
		newPassword: 'novaSenha456',
		confirmPassword: 'novaSenha456',
	}

	function changeErrors(input: typeof valid) {
		const result = changePasswordSchema.safeParse(input)
		return result.success
			? []
			: [...new Set(result.error.issues.map((issue) => issue.path[0]))]
	}

	it('aceita a troca válida', () => {
		expect(changeErrors(valid)).toEqual([])
	})

	it('exige os três campos', () => {
		expect(
			changeErrors({
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
			}),
		).toEqual(['currentPassword', 'newPassword', 'confirmPassword'])
	})

	it('recusa a nova senha curta', () => {
		expect(
			changeErrors({
				...valid,
				newPassword: 'curta',
				confirmPassword: 'curta',
			}),
		).toEqual(['newPassword'])
	})

	it('recusa a nova senha com mais de 72 caracteres', () => {
		const long = 'a'.repeat(73)
		expect(
			changeErrors({ ...valid, newPassword: long, confirmPassword: long }),
		).toEqual(['newPassword'])
	})

	it('recusa a nova senha com 72 caracteres e mais de 72 bytes', () => {
		const long = 'ç'.repeat(40)
		expect(
			changeErrors({ ...valid, newPassword: long, confirmPassword: long }),
		).toEqual(['newPassword'])
	})

	it('recusa a confirmação diferente', () => {
		expect(changeErrors({ ...valid, confirmPassword: 'novaSenha789' })).toEqual(
			['confirmPassword'],
		)
	})
})

describe('classroomNameSchema', () => {
	const errorsOf = (name: string) => {
		const result = classroomNameSchema.safeParse({ name })
		return result.success ? [] : result.error.issues.map((i) => i.message)
	}

	it('recusa o nome vazio ou só com espaços', () => {
		expect(errorsOf('')).toEqual(['Informe o nome da turma.'])
		expect(errorsOf('   ')).toEqual(['Informe o nome da turma.'])
	})

	it('aceita 60 caracteres e recusa 61', () => {
		expect(errorsOf('a'.repeat(60))).toEqual([])
		expect(errorsOf('a'.repeat(61))).toEqual(['Use no máximo 60 caracteres.'])
	})

	it('conta o tamanho depois de tirar os espaços das pontas', () => {
		expect(errorsOf(`  ${'a'.repeat(60)}  `)).toEqual([])
	})

	it('tira os espaços das pontas', () => {
		expect(classroomNameSchema.parse({ name: '  Turma 3 ' })).toEqual({
			name: 'Turma 3',
		})
	})
})

describe('renameClassroomSchema', () => {
	it('exige um id UUID', () => {
		expect(
			renameClassroomSchema.safeParse({ id: '1', name: 'Turma 1' }).success,
		).toBe(false)
		expect(
			renameClassroomSchema.parse({
				id: '7d3f1c2a-1b2c-4d5e-8f90-a1b2c3d4e5f6',
				name: ' Turma 1 ',
			}),
		).toEqual({ id: '7d3f1c2a-1b2c-4d5e-8f90-a1b2c3d4e5f6', name: 'Turma 1' })
	})
})
