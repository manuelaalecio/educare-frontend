import { createServerFn } from '@tanstack/react-start'
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
	changePasswordSchema,
	classroomIdSchema,
	classroomNameSchema,
	loginSchema,
	renameClassroomSchema,
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
// das pontas do nome). A API devolve 403 para quem não é ADMIN.

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
