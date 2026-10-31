import type { ApiClient } from './client'
import { ApiError, type FormError, toFormError, unwrap } from './errors'
import { messages } from './messages'
import type { components } from './schema.gen'
import type { SessionCookies } from './session'
import type { ChangePasswordValues, LoginValues } from './validation'

// Lógica das server functions de autenticação, com as dependências injetadas
// para testar sem o runtime do Start. A ligação fica em `functions.ts`.

export type FormResult =
	| { ok: true }
	| ({ ok: false } & Omit<FormError, 'kind'> & {
				kind: FormError['kind'] | 'invalid-credentials'
			})

export type CurrentUser = Pick<
	components['schemas']['MeResponse'],
	'id' | 'name' | 'login' | 'role'
>

/** `expired`: havia cookie, mas a API recusou o token. */
export type Session = { user: CurrentUser | null; expired: boolean }

type Api = Pick<ApiClient, 'GET' | 'POST' | 'PUT'>

export async function performLogin(
	deps: { api: Api; cookies: Pick<SessionCookies, 'set'> },
	values: LoginValues,
): Promise<FormResult> {
	try {
		const { accessToken, expiresIn } = await unwrap(
			deps.api.POST('/api/v1/auth/login', { body: values }),
		)
		deps.cookies.set(accessToken, expiresIn)
		return { ok: true }
	} catch (error) {
		// O 401 do login é credencial inválida, não sessão expirada.
		if (error instanceof ApiError && error.kind === 'unauthorized') {
			return {
				ok: false,
				kind: 'invalid-credentials',
				message: messages.invalidCredentials,
				fieldErrors: {},
			}
		}
		return { ok: false, ...toFormError(error) }
	}
}

export function performLogout(deps: {
	cookies: Pick<SessionCookies, 'clear'>
}): { ok: true } {
	deps.cookies.clear()
	return { ok: true }
}

export async function fetchSession(deps: {
	api: (token: string) => Pick<Api, 'GET'>
	cookies: Pick<SessionCookies, 'get' | 'clear'>
}): Promise<Session> {
	const token = deps.cookies.get()
	if (!token) return { user: null, expired: false }
	try {
		const me = await unwrap(deps.api(token).GET('/api/v1/auth/me'))
		return {
			user: { id: me.id, name: me.name, login: me.login, role: me.role },
			expired: false,
		}
	} catch (error) {
		if (error instanceof ApiError && error.kind === 'unauthorized') {
			deps.cookies.clear()
			return { user: null, expired: true }
		}
		throw error
	}
}

export async function performChangePassword(
	deps: { api: Pick<Api, 'PUT'> },
	values: Pick<ChangePasswordValues, 'currentPassword' | 'newPassword'>,
): Promise<FormResult> {
	try {
		await unwrap(
			deps.api.PUT('/api/v1/auth/me/password', {
				body: {
					currentPassword: values.currentPassword,
					newPassword: values.newPassword,
				},
			}),
		)
		return { ok: true }
	} catch (error) {
		// O 401 segue para o middleware, que encerra a sessão.
		if (error instanceof ApiError && error.kind === 'unauthorized') throw error
		return { ok: false, ...toFormError(error) }
	}
}
