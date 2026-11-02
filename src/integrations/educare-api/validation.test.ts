import {
	afterEach,
	beforeEach,
	describe,
	expect,
	expectTypeOf,
	it,
	vi,
} from 'vitest'
import type { components } from './schema.gen'
import {
	CHILD_MAX_LENGTH,
	type ChildFormValues,
	type ChildRequest,
	changePasswordSchema,
	childFormSchema,
	childIdSchema,
	childRequestSchema,
	classroomNameSchema,
	createUserSchema,
	EMPTY_CHILD_FORM_VALUES,
	isValidBirthCertificate,
	isValidCpf,
	isValidDate,
	loginSchema,
	renameClassroomSchema,
	resetPasswordFormSchema,
	resetPasswordSchema,
	toChildRequest,
	todayInSaoPaulo,
	UFS,
	updateChildSchema,
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

// Matrícula de teste (a do cenário "Matrícula mascarada" da spec).
const REGISTRATION = '10453901552022100012345612345672'
const MASKED_REGISTRATION = '104539 01 55 2022 1 00012 345 6123456 72'
const CLASSROOM_ID = '0190f4a2-0000-7000-8000-000000000001'

const validForm: ChildFormValues = {
	...EMPTY_CHILD_FORM_VALUES,
	classroomId: CLASSROOM_ID,
	name: 'Ana Lima',
	birthDate: '2018-05-10',
	cep: '01310-100',
	address: 'Avenida Paulista',
	addressNumber: '1000',
	neighborhood: 'Bela Vista',
	city: 'São Paulo',
	state: 'SP',
}

function formErrors(values: Partial<ChildFormValues>) {
	const result = childFormSchema.safeParse({ ...validForm, ...values })
	if (result.success) return {}
	return Object.fromEntries(
		result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
	)
}

describe('todayInSaoPaulo', () => {
	it('usa o dia de São Paulo, não o de UTC', () => {
		expect(todayInSaoPaulo(new Date('2026-11-02T01:00:00Z'))).toBe('2026-11-01')
		expect(todayInSaoPaulo(new Date('2026-11-02T03:00:00Z'))).toBe('2026-11-02')
	})
})

describe('isValidDate', () => {
	it('aceita datas que existem', () => {
		expect(isValidDate('2024-02-29')).toBe(true)
		expect(isValidDate('2018-05-10')).toBe(true)
	})

	it('recusa datas que não existem ou fora do formato', () => {
		expect(isValidDate('2023-02-29')).toBe(false)
		expect(isValidDate('2023-13-01')).toBe(false)
		expect(isValidDate('2023-04-31')).toBe(false)
		expect(isValidDate('10/05/2018')).toBe(false)
		expect(isValidDate('')).toBe(false)
	})
})

describe('isValidCpf', () => {
	it('aceita CPFs com os verificadores certos', () => {
		expect(isValidCpf('52998224725')).toBe(true)
		expect(isValidCpf('11144477735')).toBe(true)
	})

	it('recusa verificador errado, tamanho errado, máscara e dígito repetido', () => {
		expect(isValidCpf('52998224724')).toBe(false)
		expect(isValidCpf('12345678900')).toBe(false)
		expect(isValidCpf('5299822472')).toBe(false)
		expect(isValidCpf('529.982.247-25')).toBe(false)
		expect(isValidCpf('11111111111')).toBe(false)
	})
})

describe('isValidBirthCertificate', () => {
	it('aceita 32 dígitos, com ou sem máscara', () => {
		expect(isValidBirthCertificate(REGISTRATION)).toBe(true)
		expect(isValidBirthCertificate(MASKED_REGISTRATION)).toBe(true)
		expect(
			isValidBirthCertificate('104539.01.55-2022-1 00012.345.6123456-72'),
		).toBe(true)
	})

	it('não confere dígitos verificadores, tipo de livro nem ano do registro', () => {
		expect(isValidBirthCertificate('0'.repeat(32))).toBe(true)
		expect(isValidBirthCertificate(`${'9'.repeat(31)}0`)).toBe(true)
	})

	it('recusa 31 ou 33 dígitos', () => {
		expect(isValidBirthCertificate(REGISTRATION.slice(0, 31))).toBe(false)
		expect(isValidBirthCertificate(`${REGISTRATION}0`)).toBe(false)
	})

	it('recusa só separadores, vazio e outros caracteres', () => {
		expect(isValidBirthCertificate(' . - ')).toBe(false)
		expect(isValidBirthCertificate('')).toBe(false)
		expect(isValidBirthCertificate(`${REGISTRATION.slice(0, 31)}A`)).toBe(false)
		expect(
			isValidBirthCertificate(
				`${REGISTRATION.slice(0, 16)}/${REGISTRATION.slice(16)}`,
			),
		).toBe(false)
	})
})

describe('childFormSchema', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-11-01T12:00:00-03:00'))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('aceita o formulário com os obrigatórios', () => {
		expect(formErrors({})).toEqual({})
	})

	it('mostra a mensagem de cada obrigatório vazio', () => {
		expect(formErrors(EMPTY_CHILD_FORM_VALUES)).toEqual({
			classroomId: 'Escolha a turma.',
			name: 'Informe o nome completo.',
			birthDate: 'Informe a data de nascimento.',
			cep: 'Informe o CEP.',
			address: 'Informe o endereço.',
			addressNumber: 'Informe o número.',
			neighborhood: 'Informe o bairro.',
			city: 'Informe a cidade.',
			state: 'Escolha a UF.',
		})
	})

	it('trata obrigatório só com espaços como vazio', () => {
		expect(formErrors({ name: '   ', city: ' ' })).toEqual({
			name: 'Informe o nome completo.',
			city: 'Informe a cidade.',
		})
	})

	it.each(
		Object.entries({
			name: CHILD_MAX_LENGTH.name,
			birthplace: 150,
			nationality: 100,
			rg: 20,
			address: 200,
			addressNumber: 20,
			addressComplement: 100,
			neighborhood: 100,
			city: 100,
			religion: 100,
			church: 150,
			healthReport: 2000,
			medication: 1000,
			medicalObservation: 2000,
		}),
	)('limita %s a %i caracteres, sem contar os espaços das pontas', (field, max) => {
		expect(formErrors({ [field]: ` ${'a'.repeat(max)} ` })).toEqual({})
		expect(formErrors({ [field]: 'a'.repeat(max + 1) })).toEqual({
			[field]: `Use no máximo ${max} caracteres.`,
		})
	})

	it('recusa a data que não existe', () => {
		expect(formErrors({ birthDate: '2023-02-29' })).toEqual({
			birthDate: 'Data inválida.',
		})
	})

	it('recusa a data no futuro no fuso de São Paulo', () => {
		expect(formErrors({ birthDate: '2026-11-02' })).toEqual({
			birthDate: 'A data de nascimento não pode ser no futuro.',
		})
		expect(formErrors({ birthDate: '2026-11-01' })).toEqual({})
	})

	it('usa o dia de São Paulo às 22h, quando em UTC já é amanhã', () => {
		vi.setSystemTime(new Date('2026-11-02T01:00:00Z'))
		expect(formErrors({ birthDate: '2026-11-02' })).toEqual({
			birthDate: 'A data de nascimento não pode ser no futuro.',
		})
	})

	it('aceita o CEP com ou sem hífen e recusa sem 8 números', () => {
		expect(formErrors({ cep: '01310100' })).toEqual({})
		expect(formErrors({ cep: '01310-10' })).toEqual({
			cep: 'O CEP tem 8 números.',
		})
		expect(formErrors({ cep: '0131A-100' })).toEqual({
			cep: 'O CEP tem 8 números.',
		})
	})

	it('aceita o CPF vazio ou válido com máscara e recusa o inválido', () => {
		expect(formErrors({ cpf: '' })).toEqual({})
		expect(formErrors({ cpf: '529.982.247-25' })).toEqual({})
		expect(formErrors({ cpf: '123.456.789-00' })).toEqual({
			cpf: 'CPF inválido.',
		})
		expect(formErrors({ cpf: '529.982.247' })).toEqual({
			cpf: 'CPF inválido.',
		})
	})

	it('recusa o RG sem letras nem números', () => {
		expect(formErrors({ rg: '12.345.678-x' })).toEqual({})
		expect(formErrors({ rg: '   ' })).toEqual({})
		expect(formErrors({ rg: '...' })).toEqual({ rg: 'RG inválido.' })
	})

	it('aceita as 27 UFs e recusa outra sigla', () => {
		expect(UFS).toHaveLength(27)
		expect(formErrors({ state: 'XX' })).toEqual({ state: 'Escolha a UF.' })
	})

	it('aceita "Não informar" e os valores dos seletores', () => {
		expect(
			formErrors({ gender: 'FEMALE', race: 'BROWN', maritalStatus: 'SINGLE' }),
		).toEqual({})
	})

	describe('matrícula da certidão', () => {
		it('aceita a matrícula vazia ou só com espaços', () => {
			expect(formErrors({ birthCertificateNumber: '' })).toEqual({})
			expect(formErrors({ birthCertificateNumber: '   ' })).toEqual({})
		})

		it('aceita 32 números, com ou sem a máscara', () => {
			expect(formErrors({ birthCertificateNumber: REGISTRATION })).toEqual({})
			expect(
				formErrors({ birthCertificateNumber: MASKED_REGISTRATION }),
			).toEqual({})
		})

		it.each([
			['31 números', REGISTRATION.slice(0, 31)],
			['33 números', `${REGISTRATION}0`],
			['só separadores', ' . - '],
			['letra', `${REGISTRATION.slice(0, 31)}A`],
		])('recusa %s', (_, birthCertificateNumber) => {
			expect(formErrors({ birthCertificateNumber })).toEqual({
				birthCertificateNumber: 'A matrícula tem 32 números.',
			})
		})

		it('mostra o erro da matrícula junto com os dos outros campos', () => {
			expect(
				formErrors({ name: '', birthCertificateNumber: REGISTRATION.slice(1) }),
			).toEqual({
				name: 'Informe o nome completo.',
				birthCertificateNumber: 'A matrícula tem 32 números.',
			})
		})
	})
})

describe('toChildRequest', () => {
	it('tira espaços e máscaras e deixa os opcionais vazios ausentes', () => {
		const request = toChildRequest({
			...validForm,
			name: '  Ana Lima ',
			cpf: '529.982.247-25',
			cep: '01310-100',
			addressComplement: '   ',
			rg: ' 12.345.678-x ',
		})
		expect(request).toMatchObject({
			name: 'Ana Lima',
			cpf: '52998224725',
			cep: '01310100',
			rg: '12.345.678-x',
		})
		expect(request.addressComplement).toBeUndefined()
	})

	it('envia os seletores em "Não informar" como ausentes', () => {
		const request = toChildRequest({ ...validForm, gender: '', race: 'BROWN' })
		expect(request.gender).toBeUndefined()
		expect(request.maritalStatus).toBeUndefined()
		expect(request.race).toBe('BROWN')
		expect(request.cpf).toBeUndefined()
	})

	it('envia a matrícula só com dígitos', () => {
		const request = toChildRequest({
			...validForm,
			birthCertificateNumber: MASKED_REGISTRATION,
		})
		expect(request.birthCertificateNumber).toBe(REGISTRATION)
	})

	it('com a matrícula vazia não envia nenhum dado de certidão', () => {
		for (const birthCertificateNumber of ['', '   ']) {
			const request = toChildRequest({ ...validForm, birthCertificateNumber })
			const sent = Object.keys(JSON.parse(JSON.stringify(request)))
			expect(sent.filter((key) => key.startsWith('birthCertificate'))).toEqual(
				[],
			)
		}
	})

	it('produz um corpo compatível com o ChildRequest do contrato', () => {
		expectTypeOf<ChildRequest>().toExtend<
			components['schemas']['ChildRequest']
		>()
	})
})

describe('childRequestSchema', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-11-01T12:00:00-03:00'))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	const request = toChildRequest(validForm)

	function requestErrors(values: Record<string, unknown>) {
		const result = childRequestSchema.safeParse({ ...request, ...values })
		if (result.success) return {}
		return Object.fromEntries(
			result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
		)
	}

	it('aceita o corpo convertido do formulário', () => {
		expect(requestErrors({})).toEqual({})
		expect(requestErrors({ birthCertificateNumber: REGISTRATION })).toEqual({})
	})

	it('recusa turma que não é UUID, CPF com máscara e CEP com hífen', () => {
		expect(
			requestErrors({
				classroomId: 'turma-1',
				cpf: '529.982.247-25',
				cep: '01310-100',
			}),
		).toEqual({
			classroomId: 'Escolha a turma.',
			cpf: 'CPF inválido.',
			cep: 'O CEP tem 8 números.',
		})
	})

	it('recusa data futura e UF fora da lista', () => {
		expect(requestErrors({ birthDate: '2026-11-02', state: 'sp' })).toEqual({
			birthDate: 'A data de nascimento não pode ser no futuro.',
			state: 'Escolha a UF.',
		})
	})

	it('recusa a matrícula com máscara ou sem 32 números', () => {
		for (const birthCertificateNumber of [
			MASKED_REGISTRATION,
			REGISTRATION.slice(0, 31),
			`${REGISTRATION}0`,
			'',
		]) {
			expect(requestErrors({ birthCertificateNumber })).toEqual({
				birthCertificateNumber: 'A matrícula tem 32 números.',
			})
		}
	})

	it('aceita o id na alteração e recusa id que não é UUID', () => {
		expect(
			updateChildSchema.safeParse({ ...request, id: CLASSROOM_ID }).success,
		).toBe(true)
		expect(updateChildSchema.safeParse({ ...request, id: '1' }).success).toBe(
			false,
		)
		expect(childIdSchema.safeParse({ id: CLASSROOM_ID }).success).toBe(true)
	})
})
