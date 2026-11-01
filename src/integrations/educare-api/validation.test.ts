import { describe, expect, it } from 'vitest'
import {
	changePasswordSchema,
	classroomNameSchema,
	createUserSchema,
	loginSchema,
	renameClassroomSchema,
	resetPasswordFormSchema,
	resetPasswordSchema,
	updateUserSchema,
	userFieldsSchema,
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

/** Primeira mensagem de cada campo, como a interface mostra. */
function messagesOf(result: {
	success: boolean
	error?: { issues: { path: PropertyKey[]; message: string }[] }
}) {
	const messages: Record<string, string> = {}
	for (const issue of result.error?.issues ?? []) {
		messages[String(issue.path[0])] ??= issue.message
	}
	return messages
}

const carlos = {
	name: 'Carlos Lima',
	login: 'carlos.lima@educare.org',
	role: 'EDUCADOR',
}

describe('userFieldsSchema', () => {
	it('aceita um usuário válido e tira os espaços das pontas', () => {
		const result = userFieldsSchema.parse({
			...carlos,
			name: '  Carlos Lima ',
			login: ' carlos.lima@educare.org  ',
		})
		expect(result).toEqual(carlos)
	})

	it.each([
		['', 'Informe o nome.'],
		['   ', 'Informe o nome.'],
		['a'.repeat(151), 'Use no máximo 150 caracteres.'],
	])('recusa o nome %j', (name, message) => {
		expect(messagesOf(userFieldsSchema.safeParse({ ...carlos, name }))).toEqual(
			{ name: message },
		)
	})

	it('aceita o nome com 150 caracteres', () => {
		expect(
			userFieldsSchema.safeParse({ ...carlos, name: 'a'.repeat(150) }).success,
		).toBe(true)
	})

	it.each([
		['', 'Informe o email.'],
		['carlos', 'Informe um email válido.'],
		['carlos@educare', 'Informe um email válido.'],
		['carlos lima@educare.org', 'Informe um email válido.'],
		[`${'a'.repeat(243)}@educare.org`, 'Use no máximo 254 caracteres.'],
	])('recusa o email %j', (login, message) => {
		expect(
			messagesOf(userFieldsSchema.safeParse({ ...carlos, login })),
		).toEqual({ login: message })
	})

	it('aceita só as funções COORDENADOR e EDUCADOR', () => {
		expect(
			userFieldsSchema.safeParse({ ...carlos, role: 'COORDENADOR' }).success,
		).toBe(true)
		expect(
			userFieldsSchema.safeParse({ ...carlos, role: 'ADMIN' }).success,
		).toBe(false)
	})
})

describe('createUserSchema', () => {
	it.each([
		['', 'Informe a senha.'],
		['a'.repeat(7), 'Use pelo menos 8 caracteres.'],
		['a'.repeat(73), 'Use no máximo 72 caracteres.'],
		['ç'.repeat(37), 'A senha é longa demais.'],
	])('recusa a senha %j', (password, message) => {
		expect(
			messagesOf(createUserSchema.safeParse({ ...carlos, password })),
		).toEqual({ password: message })
	})

	it.each([8, 72])('aceita a senha com %i caracteres', (length) => {
		expect(
			createUserSchema.safeParse({ ...carlos, password: 'a'.repeat(length) })
				.success,
		).toBe(true)
	})
})

describe('updateUserSchema', () => {
	it('exige o id e os dados de antes da edição', () => {
		const result = updateUserSchema.safeParse({
			...carlos,
			id: '2b1f6c1e-1c7a-4a7e-9a52-4d8f7c1b2a10',
			currentRole: 'COORDENADOR',
			currentLogin: 'carlos.lima@educare.org',
		})
		expect(result.success).toBe(true)
		expect(updateUserSchema.safeParse({ ...carlos, id: 'x' }).success).toBe(
			false,
		)
	})
})

describe('resetPasswordFormSchema', () => {
	it('recusa senhas diferentes', () => {
		expect(
			messagesOf(
				resetPasswordFormSchema.safeParse({
					newPassword: 'senha-forte-1',
					confirmPassword: 'senha-forte-2',
				}),
			),
		).toEqual({ confirmPassword: 'As senhas não conferem.' })
	})

	it('pede as duas senhas', () => {
		expect(
			messagesOf(
				resetPasswordFormSchema.safeParse({
					newPassword: '',
					confirmPassword: '',
				}),
			),
		).toEqual({
			newPassword: 'Informe a nova senha.',
			confirmPassword: 'Confirme a nova senha.',
		})
	})

	it('aceita senhas iguais e válidas, e o servidor exige o id', () => {
		const values = {
			newPassword: 'senha-forte-1',
			confirmPassword: 'senha-forte-1',
		}
		expect(resetPasswordFormSchema.safeParse(values).success).toBe(true)
		expect(resetPasswordSchema.safeParse(values).success).toBe(false)
		expect(
			resetPasswordSchema.safeParse({
				...values,
				id: '2b1f6c1e-1c7a-4a7e-9a52-4d8f7c1b2a10',
			}).success,
		).toBe(true)
	})
})
