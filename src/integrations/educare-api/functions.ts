import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	fetchSession,
	performChangePassword,
	performLogin,
	performLogout,
} from './auth'
import {
	listClassrooms,
	createClassroom as performCreateClassroom,
	deleteClassroom as performDeleteClassroom,
	renameClassroom as performRenameClassroom,
} from './classrooms'
import { createApiClient } from './client'
import { authenticated } from './middleware'
import { requestCookies } from './request'
import {
	listUsers,
	createUser as performCreateUser,
	deleteUser as performDeleteUser,
	resetUserPassword as performResetUserPassword,
	updateUser as performUpdateUser,
} from './users'
import {
	changePasswordSchema,
	classroomIdSchema,
	classroomNameSchema,
	createUserSchema,
	loginSchema,
	renameClassroomSchema,
	resetPasswordSchema,
	updateUserSchema,
	userIdSchema,
} from './validation'

// Server functions: só ligam a lógica de `auth.ts` ao Start. O token fica no
// cookie `httpOnly` e nunca aparece no que estas funções devolvem.

export const login = createServerFn({ method: 'POST' })
	.validator(loginSchema)
	.handler(({ data }) =>
		performLogin({ api: createApiClient(), cookies: requestCookies }, data),
	)

export const logout = createServerFn({ method: 'POST' }).handler(() =>
	performLogout({ cookies: requestCookies }),
)

export const getCurrentUser = createServerFn({ method: 'POST' }).handler(() =>
	fetchSession({ api: createApiClient, cookies: requestCookies }),
)

export const changeOwnPassword = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(changePasswordSchema)
	.handler(({ data, context }) =>
		performChangePassword(
			{ api: createApiClient(context.token), cookies: requestCookies },
			data,
		),
	)

// Turmas: o `validator` aplica o mesmo schema do formulário (e tira os espaços
// das pontas do nome). A API devolve 403 para quem não é COORDENADOR.

export const getClassrooms = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.handler(({ context }) => listClassrooms(createApiClient(context.token)))

export const createClassroom = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(classroomNameSchema)
	.handler(({ data, context }) =>
		performCreateClassroom(createApiClient(context.token), data),
	)

export const renameClassroom = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(renameClassroomSchema)
	.handler(({ data, context }) =>
		performRenameClassroom(createApiClient(context.token), data),
	)

export const deleteClassroom = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(classroomIdSchema)
	.handler(({ data, context }) =>
		performDeleteClassroom(createApiClient(context.token), data),
	)

// Usuários: a API devolve 403 para quem não é COORDENADOR. Os validators
// repetem as regras do formulário; nada aqui registra o corpo (senha e email).

export const getUsers = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(z.object({ page: z.number().int().min(1) }))
	.handler(({ data, context }) =>
		listUsers(createApiClient(context.token), data),
	)

export const createUser = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(createUserSchema)
	.handler(({ data, context }) =>
		performCreateUser(createApiClient(context.token), data),
	)

export const updateUser = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(updateUserSchema)
	.handler(({ data, context }) =>
		performUpdateUser(createApiClient(context.token), data),
	)

export const resetUserPassword = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(resetPasswordSchema)
	.handler(({ data, context }) =>
		performResetUserPassword(createApiClient(context.token), data),
	)

export const deleteUser = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(userIdSchema)
	.handler(({ data, context }) =>
		performDeleteUser(createApiClient(context.token), data),
	)
