import { z } from 'zod'

// Funções dos usuários. Só `COORDENADOR` acessa Configurações.
export const ROLES = ['COORDENADOR', 'EDUCADOR'] as const
export type Role = (typeof ROLES)[number]
export const COORDINATOR_ROLE: Role = 'COORDENADOR'

// Espelha as regras do educare-backend para o login.
export const LOGIN_MAX_LENGTH = 254
// Limite do BCrypt, contado em bytes UTF-8.
export const PASSWORD_MAX_BYTES = 72

const utf8Length = (value: string) => new TextEncoder().encode(value).length

export const loginSchema = z.object({
	login: z
		.string()
		.trim()
		.min(1, 'Informe o email.')
		.max(LOGIN_MAX_LENGTH, `Use no máximo ${LOGIN_MAX_LENGTH} caracteres.`),
	password: z
		.string()
		.min(1, 'Informe a senha.')
		.refine(
			(value) => utf8Length(value) <= PASSWORD_MAX_BYTES,
			'A senha é longa demais.',
		),
})

export type LoginValues = z.infer<typeof loginSchema>

export const NEW_PASSWORD_MIN_LENGTH = 8
export const NEW_PASSWORD_MAX_LENGTH = 72

const fitsPasswordBytes = (value: string) =>
	utf8Length(value) <= PASSWORD_MAX_BYTES

/** Regra da senha nova (Minha conta, novo usuário e redefinição). */
function newPasswordField(emptyMessage: string) {
	return z
		.string()
		.min(1, emptyMessage)
		.min(
			NEW_PASSWORD_MIN_LENGTH,
			`Use pelo menos ${NEW_PASSWORD_MIN_LENGTH} caracteres.`,
		)
		.max(
			NEW_PASSWORD_MAX_LENGTH,
			`Use no máximo ${NEW_PASSWORD_MAX_LENGTH} caracteres.`,
		)
		.refine(fitsPasswordBytes, 'A senha é longa demais.')
}

const passwordsMatch = {
	check: (values: { newPassword: string; confirmPassword: string }) =>
		values.confirmPassword === values.newPassword,
	params: { path: ['confirmPassword'], message: 'As senhas não conferem.' },
}

export const changePasswordSchema = z
	.object({
		currentPassword: z
			.string()
			.min(1, 'Informe a senha atual.')
			.refine(fitsPasswordBytes, 'A senha é longa demais.'),
		newPassword: newPasswordField('Informe a nova senha.'),
		confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
	})
	.refine(passwordsMatch.check, passwordsMatch.params)

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>

// Espelha as regras do educare-backend para o nome da turma. O tamanho é
// contado em unidades UTF-16, como o `String.length` do Java.
export const CLASSROOM_NAME_MAX_LENGTH = 60

export const classroomNameSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Informe o nome da turma.')
		.max(
			CLASSROOM_NAME_MAX_LENGTH,
			`Use no máximo ${CLASSROOM_NAME_MAX_LENGTH} caracteres.`,
		),
})

export type ClassroomNameValues = z.infer<typeof classroomNameSchema>

export const classroomIdSchema = z.object({ id: z.uuid() })

export const renameClassroomSchema = classroomIdSchema.extend(
	classroomNameSchema.shape,
)

export type RenameClassroomValues = z.infer<typeof renameClassroomSchema>

// Espelha as regras do educare-backend para os usuários.
export const USER_NAME_MAX_LENGTH = 150
// O mesmo formato que o backend aceita: nome@dominio.tld, sem espaços.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export const userIdSchema = z.object({ id: z.uuid() })

export const userFieldsSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Informe o nome.')
		.max(
			USER_NAME_MAX_LENGTH,
			`Use no máximo ${USER_NAME_MAX_LENGTH} caracteres.`,
		),
	login: z
		.string()
		.trim()
		.min(1, 'Informe o email.')
		.max(LOGIN_MAX_LENGTH, `Use no máximo ${LOGIN_MAX_LENGTH} caracteres.`)
		.regex(EMAIL_PATTERN, 'Informe um email válido.'),
	role: z.enum(ROLES),
})

export type UserFieldsValues = z.infer<typeof userFieldsSchema>

export const createUserSchema = userFieldsSchema.extend({
	password: newPasswordField('Informe a senha.'),
})

export type CreateUserValues = z.infer<typeof createUserSchema>

// `currentRole` e `currentLogin` são os dados de antes da edição: servem só
// para entender um `409` e não vão para a API.
export const updateUserSchema = userIdSchema.extend({
	...userFieldsSchema.shape,
	currentRole: z.string(),
	currentLogin: z.string(),
})

export type UpdateUserValues = z.infer<typeof updateUserSchema>

export const resetPasswordFormSchema = z
	.object({
		newPassword: newPasswordField('Informe a nova senha.'),
		confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
	})
	.refine(passwordsMatch.check, passwordsMatch.params)

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>

export const resetPasswordSchema = userIdSchema
	.extend({
		newPassword: newPasswordField('Informe a nova senha.'),
		confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
	})
	.refine(passwordsMatch.check, passwordsMatch.params)

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

// --- Crianças ---------------------------------------------------------------
//
// Espelha as regras planejadas no educare-backend (changes `add-child-crud` e
// `link-child-to-classroom`). Os nomes dos campos são os do `ChildRequest` do
// contrato, para que os `errors` do `400` caiam nos campos sem tradução.

export const GENDERS = ['FEMALE', 'MALE', 'OTHER'] as const
export type Gender = (typeof GENDERS)[number]

// Na ordem das categorias do IBGE: branca, preta, parda, amarela e indígena.
export const RACES = [
	'WHITE',
	'BLACK',
	'BROWN',
	'YELLOW',
	'INDIGENOUS',
] as const
export type Race = (typeof RACES)[number]

export const MARITAL_STATUSES = [
	'SINGLE',
	'MARRIED',
	'STABLE_UNION',
	'DIVORCED',
	'WIDOWED',
] as const
export type MaritalStatus = (typeof MARITAL_STATUSES)[number]

export const UFS = [
	'AC',
	'AL',
	'AP',
	'AM',
	'BA',
	'CE',
	'DF',
	'ES',
	'GO',
	'MA',
	'MT',
	'MS',
	'MG',
	'PA',
	'PB',
	'PR',
	'PE',
	'PI',
	'RJ',
	'RN',
	'RS',
	'RO',
	'RR',
	'SC',
	'SP',
	'SE',
	'TO',
] as const
export type Uf = (typeof UFS)[number]

// Tamanhos máximos, contados sem os espaços das pontas (unidades UTF-16, como
// o `String.length` do Java).
export const CHILD_MAX_LENGTH = {
	name: 150,
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
} as const

export const CPF_LENGTH = 11
export const CEP_LENGTH = 8
export const BIRTH_CERTIFICATE_LENGTH = 32

const SAO_PAULO_DATE = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'America/Sao_Paulo',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
})

/** A data de hoje em São Paulo, `AAAA-MM-DD`, igual no SSR (UTC) e no navegador. */
export function todayInSaoPaulo(now: Date = new Date()): string {
	const parts = SAO_PAULO_DATE.formatToParts(now)
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((item) => item.type === type)?.value ?? ''
	return `${part('year')}-${part('month')}-${part('day')}`
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** Data `AAAA-MM-DD` que existe no calendário (sem `Date` local, sem fuso). */
export function isValidDate(value: string): boolean {
	const match = DATE_PATTERN.exec(value)
	if (!match) return false
	const [year, month, day] = match.slice(1).map(Number)
	if (year < 1 || month < 1 || month > 12 || day < 1) return false
	const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
	return day <= daysInMonth
}

/** CPF só com dígitos: 11 dígitos, não repetidos, com os verificadores certos. */
export function isValidCpf(digits: string): boolean {
	if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false
	const numbers = [...digits].map(Number)
	for (const size of [9, 10]) {
		let sum = 0
		for (let i = 0; i < size; i++) sum += numbers[i] * (size + 1 - i)
		const rest = (sum * 10) % 11
		if ((rest === 10 ? 0 : rest) !== numbers[size]) return false
	}
	return true
}

const withoutSeparators = (value: string) => value.replace(/[\s.-]/g, '')

/**
 * Matrícula da certidão de nascimento: exatamente 32 dígitos depois de tirar
 * pontos, espaços e hífens, como no back (`BirthRegistrationNumber`). Não
 * confere dígitos verificadores, tipo de livro nem ano do registro.
 */
export function isValidBirthCertificate(number: string): boolean {
	return /^\d{32}$/.test(withoutSeparators(number))
}

const maxMessage = (max: number) => `Use no máximo ${max} caracteres.`
const fits = (max: number) => (value: string) => value.trim().length <= max
const filled = (value: string) => value.trim().length > 0

const optionalText = (max: number) =>
	z.string().refine(fits(max), maxMessage(max))

const requiredText = (max: number, emptyMessage: string) =>
	z.string().refine(filled, emptyMessage).refine(fits(max), maxMessage(max))

const birthDateField = z
	.string()
	.refine(filled, 'Informe a data de nascimento.')
	.refine((value) => !filled(value) || isValidDate(value), 'Data inválida.')
	.refine(
		(value) => !isValidDate(value) || value <= todayInSaoPaulo(),
		'A data de nascimento não pode ser no futuro.',
	)

const cepField = z
	.string()
	.refine(filled, 'Informe o CEP.')
	.refine(
		(value) => !filled(value) || /^\d{8}$/.test(withoutSeparators(value)),
		'O CEP tem 8 números.',
	)

// Vazio é "não informado"; o CPF pode vir com a máscara.
const cpfField = z
	.string()
	.refine(
		(value) => !filled(value) || isValidCpf(withoutSeparators(value)),
		'CPF inválido.',
	)

const rgField = optionalText(CHILD_MAX_LENGTH.rg).refine(
	(value) => !filled(value) || /[\p{L}\p{N}]/u.test(value),
	'RG inválido.',
)

const choiceMessage = 'Escolha uma opção da lista.'

const stateField = z
	.string()
	.refine(filled, 'Escolha a UF.')
	.refine(
		(value) => !filled(value) || (UFS as readonly string[]).includes(value),
		'Escolha a UF.',
	)

const birthCertificateMessage = `A matrícula tem ${BIRTH_CERTIFICATE_LENGTH} números.`

// Vazio é "não informado"; a matrícula pode vir com a máscara.
const birthCertificateField = z
	.string()
	.refine(
		(value) => !filled(value) || isValidBirthCertificate(value),
		birthCertificateMessage,
	)

/**
 * Valores do formulário de criança: todos `string`, com `''` para "Não
 * informar" nos seletores e nos opcionais. Só valida, sem transformar; o
 * corpo da API sai de `toChildRequest`.
 */
export const childFormSchema = z.object({
	classroomId: z.string().refine(filled, 'Escolha a turma.'),
	name: requiredText(CHILD_MAX_LENGTH.name, 'Informe o nome completo.'),
	birthDate: birthDateField,
	birthplace: optionalText(CHILD_MAX_LENGTH.birthplace),
	nationality: optionalText(CHILD_MAX_LENGTH.nationality),
	gender: z.enum(['', ...GENDERS] as const, choiceMessage),
	race: z.enum(['', ...RACES] as const, choiceMessage),
	maritalStatus: z.enum(['', ...MARITAL_STATUSES] as const, choiceMessage),
	cpf: cpfField,
	rg: rgField,
	birthCertificateNumber: birthCertificateField,
	cep: cepField,
	address: requiredText(CHILD_MAX_LENGTH.address, 'Informe o endereço.'),
	addressNumber: requiredText(
		CHILD_MAX_LENGTH.addressNumber,
		'Informe o número.',
	),
	addressComplement: optionalText(CHILD_MAX_LENGTH.addressComplement),
	neighborhood: requiredText(
		CHILD_MAX_LENGTH.neighborhood,
		'Informe o bairro.',
	),
	city: requiredText(CHILD_MAX_LENGTH.city, 'Informe a cidade.'),
	state: stateField,
	religion: optionalText(CHILD_MAX_LENGTH.religion),
	church: optionalText(CHILD_MAX_LENGTH.church),
	healthReport: optionalText(CHILD_MAX_LENGTH.healthReport),
	medication: optionalText(CHILD_MAX_LENGTH.medication),
	medicalObservation: optionalText(CHILD_MAX_LENGTH.medicalObservation),
})

export type ChildFormValues = z.input<typeof childFormSchema>

export const EMPTY_CHILD_FORM_VALUES: ChildFormValues = {
	classroomId: '',
	name: '',
	birthDate: '',
	birthplace: '',
	nationality: '',
	gender: '',
	race: '',
	maritalStatus: '',
	cpf: '',
	rg: '',
	birthCertificateNumber: '',
	cep: '',
	address: '',
	addressNumber: '',
	addressComplement: '',
	neighborhood: '',
	city: '',
	state: '',
	religion: '',
	church: '',
	healthReport: '',
	medication: '',
	medicalObservation: '',
}

const onlyDigits = /^\d+$/

// O corpo da API, já convertido por `toChildRequest`: textos sem espaços nas
// pontas, opcionais ausentes em vez de vazios, CPF, CEP e matrícula só com
// dígitos. As regras são as do formulário. Validator da server function de
// cadastrar criança.
export const childRequestSchema = z.object({
	classroomId: z.uuid('Escolha a turma.'),
	name: requiredText(CHILD_MAX_LENGTH.name, 'Informe o nome completo.'),
	birthDate: birthDateField,
	birthplace: optionalText(CHILD_MAX_LENGTH.birthplace).optional(),
	nationality: optionalText(CHILD_MAX_LENGTH.nationality).optional(),
	gender: z.enum(GENDERS, choiceMessage).optional(),
	race: z.enum(RACES, choiceMessage).optional(),
	maritalStatus: z.enum(MARITAL_STATUSES, choiceMessage).optional(),
	cpf: z
		.string()
		.refine(
			(value) => onlyDigits.test(value) && isValidCpf(value),
			'CPF inválido.',
		)
		.optional(),
	rg: rgField.optional(),
	birthCertificateNumber: z
		.string()
		.regex(/^\d{32}$/, birthCertificateMessage)
		.optional(),
	cep: z.string().regex(/^\d{8}$/, 'O CEP tem 8 números.'),
	address: requiredText(CHILD_MAX_LENGTH.address, 'Informe o endereço.'),
	addressNumber: requiredText(
		CHILD_MAX_LENGTH.addressNumber,
		'Informe o número.',
	),
	addressComplement: optionalText(
		CHILD_MAX_LENGTH.addressComplement,
	).optional(),
	neighborhood: requiredText(
		CHILD_MAX_LENGTH.neighborhood,
		'Informe o bairro.',
	),
	city: requiredText(CHILD_MAX_LENGTH.city, 'Informe a cidade.'),
	state: z.enum(UFS, 'Escolha a UF.'),
	religion: optionalText(CHILD_MAX_LENGTH.religion).optional(),
	church: optionalText(CHILD_MAX_LENGTH.church).optional(),
	healthReport: optionalText(CHILD_MAX_LENGTH.healthReport).optional(),
	medication: optionalText(CHILD_MAX_LENGTH.medication).optional(),
	medicalObservation: optionalText(
		CHILD_MAX_LENGTH.medicalObservation,
	).optional(),
})

export type ChildRequest = z.infer<typeof childRequestSchema>

export const childIdSchema = z.object({ id: z.uuid() })

/**
 * Validator da server function de alterar criança: `{ id, ...corpo }`, no
 * mesmo formato de `renameClassroomSchema` e `updateUserSchema`. A server
 * function separa o `id` (vai na URL) do corpo.
 */
export const updateChildSchema = childIdSchema.extend(childRequestSchema.shape)

export type UpdateChildValues = z.infer<typeof updateChildSchema>

const optionalValue = (value: string) => value.trim() || undefined
const optionalDigits = (value: string) => value.replace(/\D/g, '') || undefined
const optionalChoiceValue = <T extends string>(value: '' | T) =>
	value === '' ? undefined : value

/**
 * Converte os valores do formulário (já validados) no corpo da API: trim,
 * opcionais vazios ausentes, CPF, CEP e matrícula só com dígitos, seletores
 * em "Não informar" e matrícula vazia ausentes. O RG vai como digitado (sem os espaços das pontas): o back o normaliza.
 */
export function toChildRequest(values: ChildFormValues): ChildRequest {
	return {
		classroomId: values.classroomId.trim(),
		name: values.name.trim(),
		birthDate: values.birthDate.trim(),
		birthplace: optionalValue(values.birthplace),
		nationality: optionalValue(values.nationality),
		gender: optionalChoiceValue(values.gender),
		race: optionalChoiceValue(values.race),
		maritalStatus: optionalChoiceValue(values.maritalStatus),
		cpf: optionalDigits(values.cpf),
		rg: optionalValue(values.rg),
		birthCertificateNumber: optionalDigits(values.birthCertificateNumber),
		cep: values.cep.replace(/\D/g, ''),
		address: values.address.trim(),
		addressNumber: values.addressNumber.trim(),
		addressComplement: optionalValue(values.addressComplement),
		neighborhood: values.neighborhood.trim(),
		city: values.city.trim(),
		state: values.state.trim().toUpperCase() as Uf,
		religion: optionalValue(values.religion),
		church: optionalValue(values.church),
		healthReport: optionalValue(values.healthReport),
		medication: optionalValue(values.medication),
		medicalObservation: optionalValue(values.medicalObservation),
	}
}
