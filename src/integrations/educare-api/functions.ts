import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	fetchSession,
	performChangePassword,
	performLogin,
	performLogout,
} from './auth'
import {
	listChildClassrooms,
	listChildren,
	createChild as performCreateChild,
	deleteChild as performDeleteChild,
	getChild as performGetChild,
	updateChild as performUpdateChild,
} from './children'
import {
	listClassrooms,
	createClassroom as performCreateClassroom,
	deleteClassroom as performDeleteClassroom,
	renameClassroom as performRenameClassroom,
} from './classrooms'
import { createApiClient } from './client'
import { invalidates } from './invalidation'
import { authenticated } from './middleware'
import { requestCookies } from './request'
import {
	afterWrite,
	forgetSession,
	serverCache,
	sessionOf,
} from './server-cache'
import {
	listUsers,
	createUser as performCreateUser,
	deleteUser as performDeleteUser,
	resetUserPassword as performResetUserPassword,
	updateUser as performUpdateUser,
} from './users'
import {
	changePasswordSchema,
	childIdSchema,
	childRequestSchema,
	classroomIdSchema,
	classroomNameSchema,
	createUserSchema,
	loginSchema,
	renameClassroomSchema,
	resetPasswordSchema,
	updateChildSchema,
	updateUserSchema,
	userIdSchema,
} from './validation'

// Server functions: só ligam a lógica de `auth.ts` ao Start. O token fica no
// cookie `httpOnly` e nunca aparece no que estas funções devolvem.
//
// As leituras de turmas, usuários e crianças passam pelo cache curto do
// servidor (`server-cache.ts`), por sessão; cada gravação limpa as tags da
// tabela `invalidates`. `/auth/me` (`getCurrentUser`) nunca passa pelo cache.

/** Lê pelo cache da sessão; a chave é o nome da leitura e a entrada validada. */
function cachedRead<T extends { ok: boolean }>(
	token: string,
	tag: Parameters<typeof serverCache.read>[1],
	name: string,
	input: unknown,
	load: () => Promise<T>,
) {
	const key = input === undefined ? name : `${name}:${JSON.stringify(input)}`
	return serverCache.read(sessionOf(token), tag, key, load)
}

export const login = createServerFn({ method: 'POST' })
	.validator(loginSchema)
	.handler(({ data }) =>
		performLogin({ api: createApiClient(), cookies: requestCookies }, data),
	)

export const logout = createServerFn({ method: 'POST' }).handler(() =>
	performLogout({ cookies: requestCookies, forgetSession }),
)

export const getCurrentUser = createServerFn({ method: 'POST' }).handler(() =>
	fetchSession({
		api: createApiClient,
		cookies: requestCookies,
		forgetSession,
	}),
)

export const changeOwnPassword = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(changePasswordSchema)
	.handler(({ data, context }) =>
		performChangePassword(
			{
				api: createApiClient(context.token),
				cookies: requestCookies,
				forgetSession,
			},
			data,
		),
	)

// Turmas: o `validator` aplica o mesmo schema do formulário (e tira os espaços
// das pontas do nome). A API devolve 403 para quem não é COORDENADOR.

export const getClassrooms = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.handler(({ context }) =>
		cachedRead(context.token, 'classrooms', 'list', undefined, () =>
			listClassrooms(createApiClient(context.token)),
		),
	)

export const createClassroom = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(classroomNameSchema)
	.handler(async ({ data, context }) =>
		afterWrite(
			await performCreateClassroom(createApiClient(context.token), data),
			invalidates.createClassroom,
		),
	)

export const renameClassroom = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(renameClassroomSchema)
	.handler(async ({ data, context }) =>
		afterWrite(
			await performRenameClassroom(createApiClient(context.token), data),
			invalidates.renameClassroom,
		),
	)

export const deleteClassroom = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(classroomIdSchema)
	.handler(async ({ data, context }) =>
		afterWrite(
			await performDeleteClassroom(createApiClient(context.token), data),
			invalidates.deleteClassroom,
		),
	)

// Usuários: a API devolve 403 para quem não é COORDENADOR. Os validators
// repetem as regras do formulário; nada aqui registra o corpo (senha e email).

export const getUsers = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(z.object({ page: z.number().int().min(1) }))
	.handler(({ data, context }) =>
		cachedRead(context.token, 'users', 'list', data, () =>
			listUsers(createApiClient(context.token), data),
		),
	)

export const createUser = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(createUserSchema)
	.handler(async ({ data, context }) =>
		afterWrite(
			await performCreateUser(createApiClient(context.token), data),
			invalidates.createUser,
		),
	)

export const updateUser = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(updateUserSchema)
	.handler(async ({ data, context }) =>
		afterWrite(
			await performUpdateUser(createApiClient(context.token), data),
			invalidates.updateUser,
		),
	)

export const resetUserPassword = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(resetPasswordSchema)
	.handler(async ({ data, context }) =>
		afterWrite(
			await performResetUserPassword(createApiClient(context.token), data),
			invalidates.resetUserPassword,
		),
	)

export const deleteUser = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(userIdSchema)
	.handler(async ({ data, context }) =>
		afterWrite(
			await performDeleteUser(createApiClient(context.token), data),
			invalidates.deleteUser,
		),
	)

// Crianças: os filtros da lista são os da URL (`pagina` começa em 1). Nada
// aqui registra corpo, resposta ou id em log (LGPD): são dados de crianças.

const childrenFiltersSchema = z.object({
	nome: z.string().optional(),
	turma: z.uuid().optional(),
	pagina: z.number().int().min(1),
})

export const getChildren = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(childrenFiltersSchema)
	.handler(({ data, context }) =>
		cachedRead(context.token, 'children', 'list', data, () =>
			listChildren(createApiClient(context.token), data),
		),
	)

export const getChild = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(childIdSchema)
	.handler(({ data, context }) =>
		cachedRead(context.token, 'children', 'detail', data, () =>
			performGetChild(createApiClient(context.token), data),
		),
	)

export const getChildClassrooms = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(childIdSchema)
	.handler(({ data, context }) =>
		cachedRead(context.token, 'children', 'classrooms', data, () =>
			listChildClassrooms(createApiClient(context.token), data),
		),
	)

export const createChild = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(childRequestSchema)
	.handler(async ({ data, context }) =>
		afterWrite(
			await performCreateChild(createApiClient(context.token), data),
			invalidates.createChild,
		),
	)

export const updateChild = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(updateChildSchema)
	.handler(async ({ data, context }) =>
		afterWrite(
			await performUpdateChild(createApiClient(context.token), data),
			invalidates.updateChild,
		),
	)

export const deleteChild = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(childIdSchema)
	.handler(async ({ data, context }) =>
		afterWrite(
			await performDeleteChild(createApiClient(context.token), data),
			invalidates.deleteChild,
		),
	)
