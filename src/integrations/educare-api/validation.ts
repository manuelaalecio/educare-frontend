import { z } from 'zod'

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

export const changePasswordSchema = z
	.object({
		currentPassword: z
			.string()
			.min(1, 'Informe a senha atual.')
			.refine(fitsPasswordBytes, 'A senha é longa demais.'),
		newPassword: z
			.string()
			.min(1, 'Informe a nova senha.')
			.min(
				NEW_PASSWORD_MIN_LENGTH,
				`Use pelo menos ${NEW_PASSWORD_MIN_LENGTH} caracteres.`,
			)
			.max(
				NEW_PASSWORD_MAX_LENGTH,
				`Use no máximo ${NEW_PASSWORD_MAX_LENGTH} caracteres.`,
			)
			.refine(fitsPasswordBytes, 'A senha é longa demais.'),
		confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
	})
	.refine((values) => values.confirmPassword === values.newPassword, {
		path: ['confirmPassword'],
		message: 'As senhas não conferem.',
	})

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
