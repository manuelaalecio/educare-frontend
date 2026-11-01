import type { ApiClient } from './client'
import { ApiError, type FormError, toFormError, unwrap } from './errors'
import { messages } from './messages'
import type { components } from './schema.gen'
import {
	COORDINATOR_ROLE,
	type CreateUserValues,
	type ResetPasswordValues,
	type UpdateUserValues,
} from './validation'

// Lógica das server functions de usuários, com a API injetada para testar sem
// o runtime do Start. A ligação fica em `functions.ts`. Nenhuma função devolve
// um `ApiError` nem repete a senha recebida.

export type User = Pick<
	components['schemas']['UserResponse'],
	'id' | 'name' | 'login' | 'role' | 'createdAt'
>

export type UsersPage = {
	/** Começa em 0, como na API. */
	number: number
	size: number
	totalElements: number
	totalPages: number
}

export type ListResult =
	| { ok: true; users: User[]; page: UsersPage }
	| { ok: false; message: string }

export type UserResult = { ok: true } | ({ ok: false } & FormError)

type Api = Pick<ApiClient, 'GET' | 'POST' | 'PUT' | 'DELETE'>

/** O `401` segue para o middleware, que encerra a sessão. */
function rethrowUnauthorized(error: unknown) {
	if (error instanceof ApiError && error.kind === 'unauthorized') throw error
}

/** Campos da API com outro nome no formulário. */
function failure(error: unknown, rename: Record<string, string> = {}) {
	rethrowUnauthorized(error)
	const result = toFormError(error)
	const fieldErrors: Record<string, string> = {}
	for (const [field, message] of Object.entries(result.fieldErrors)) {
		fieldErrors[rename[field] ?? field] = message
	}
	return { ok: false as const, ...result, fieldErrors }
}

const emailTaken = (result: FormError) => ({
	ok: false as const,
	...result,
	message: undefined,
	fieldErrors: { login: messages.userEmailTaken },
})

const lastCoordinator = (result: FormError) => ({
	ok: false as const,
	...result,
	message: messages.lastCoordinator,
})

const normalizeLogin = (login: string) => login.trim().toLowerCase()

/** Uma página de usuários, na ordem da API (por nome). `page` começa em 1. */
export async function listUsers(
	api: Pick<Api, 'GET'>,
	values: { page: number },
): Promise<ListResult> {
	try {
		const result = await unwrap(
			api.GET('/api/v1/users', {
				// O contrato descreve o `Pageable` como um objeto, mas o Spring lê
				// `page`, `size` e `sort` soltos na query.
				params: { query: { page: values.page - 1 } as never },
			}),
		)
		return {
			ok: true,
			users: result.content.map((user) => ({
				id: user.id,
				name: user.name,
				login: user.login,
				role: user.role,
				createdAt: user.createdAt,
			})),
			page: {
				number: result.page.number,
				size: result.page.size,
				totalElements: result.page.totalElements,
				totalPages: result.page.totalPages,
			},
		}
	} catch (error) {
		rethrowUnauthorized(error)
		return {
			ok: false,
			message: toFormError(error).message ?? messages.unavailable,
		}
	}
}

export async function createUser(
	api: Pick<Api, 'POST'>,
	values: CreateUserValues,
): Promise<UserResult> {
	try {
		await unwrap(
			api.POST('/api/v1/users', {
				body: {
					name: values.name.trim(),
					login: values.login.trim(),
					password: values.password,
					role: values.role,
				},
			}),
		)
		return { ok: true }
	} catch (error) {
		const result = failure(error)
		// Ao criar, o único conflito é o email.
		return result.kind === 'conflict' ? emailTaken(result) : result
	}
}

/**
 * O backend devolve `409` tanto para email já usado quanto para o último
 * coordenador, sem um código que os separe. O que o pedido mudou decide;
 * quando mudam os dois, vale o `detail` da API (design, D5).
 */
export async function updateUser(
	api: Pick<Api, 'PUT'>,
	values: UpdateUserValues,
): Promise<UserResult> {
	try {
		await unwrap(
			api.PUT('/api/v1/users/{id}', {
				params: { path: { id: values.id } },
				body: {
					name: values.name.trim(),
					login: values.login.trim(),
					role: values.role,
				},
			}),
		)
		return { ok: true }
	} catch (error) {
		const result = failure(error)
		if (result.kind !== 'conflict') return result
		const losesCoordinator =
			values.currentRole === COORDINATOR_ROLE &&
			values.role !== COORDINATOR_ROLE
		const loginChanged =
			normalizeLogin(values.login) !== normalizeLogin(values.currentLogin)
		if (!losesCoordinator) return emailTaken(result)
		if (!loginChanged) return lastCoordinator(result)
		return result
	}
}

export async function resetUserPassword(
	api: Pick<Api, 'PUT'>,
	values: ResetPasswordValues,
): Promise<UserResult> {
	try {
		await unwrap(
			api.PUT('/api/v1/users/{id}/password', {
				params: { path: { id: values.id } },
				body: { password: values.newPassword },
			}),
		)
		return { ok: true }
	} catch (error) {
		return failure(error, { password: 'newPassword' })
	}
}

/** O `409` é o último coordenador; a interface não oferece excluir a si mesmo. */
export async function deleteUser(
	api: Pick<Api, 'DELETE'>,
	values: { id: string },
): Promise<UserResult> {
	try {
		await unwrap(
			api.DELETE('/api/v1/users/{id}', {
				params: { path: { id: values.id } },
			}),
		)
		return { ok: true }
	} catch (error) {
		const result = failure(error)
		return result.kind === 'conflict' ? lastCoordinator(result) : result
	}
}
