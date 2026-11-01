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
