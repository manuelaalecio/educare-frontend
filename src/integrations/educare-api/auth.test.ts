// @vitest-environment node
import { serialize } from 'cookie-es'
import { describe, expect, it, vi } from 'vitest'
import {
	fetchSession,
	performChangePassword,
	performLogin,
	performLogout,
} from './auth'
import { messages } from './messages'
import { SESSION_COOKIE, sessionCookieOptions } from './session'

const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.token-da-sessao'

function reply(status: number, body?: unknown) {
	const response = new Response(null, { status })
	return Promise.resolve(
		response.ok ? { data: body, response } : { error: body, response },
	)
}

function apiReturning(status: number, body?: unknown) {
	const call = vi.fn(() => reply(status, body))
	return { GET: call, POST: call, PUT: call } as never
}

function jar(token?: string) {
	return { get: vi.fn(() => token), set: vi.fn(), clear: vi.fn() }
}

const credentials = { login: 'ana.souza@educare.org', password: 'segredo123' }

describe('performLogin', () => {
	it('grava o token no cookie com o Max-Age do expiresIn', async () => {
		const cookies = jar()
		const result = await performLogin(
			{
				api: apiReturning(200, {
					accessToken: TOKEN,
					tokenType: 'Bearer',
					expiresIn: 28800,
				}),
				cookies,
			},
			credentials,
		)

		expect(result).toEqual({ ok: true })
		expect(cookies.set).toHaveBeenCalledWith(TOKEN, 28800)
		expect(JSON.stringify(result)).not.toContain(TOKEN)
	})

	it('converte o 401 em credenciais inválidas sem gravar cookie', async () => {
		const cookies = jar()
		const result = await performLogin(
			{
				api: apiReturning(401, { title: 'Unauthorized', status: 401 }),
				cookies,
			},
			credentials,
		)

		expect(result).toEqual({
			ok: false,
			kind: 'invalid-credentials',
			message: messages.invalidCredentials,
			fieldErrors: {},
		})
		expect(cookies.set).not.toHaveBeenCalled()
	})

	it('converte o 400 em erros por campo sem gravar cookie', async () => {
		const cookies = jar()
		const result = await performLogin(
			{
				api: apiReturning(400, {
					title: 'Bad Request',
					status: 400,
					errors: [{ field: 'password', message: 'é obrigatória' }],
				}),
				cookies,
			},
			credentials,
		)

		expect(result).toMatchObject({
			ok: false,
			kind: 'validation',
			fieldErrors: { password: 'é obrigatória' },
		})
		expect(cookies.set).not.toHaveBeenCalled()
	})

	it('converte a falha de rede em indisponível sem gravar cookie', async () => {
		const cookies = jar()
		const failing = vi.fn(() => Promise.reject(new TypeError('fetch failed')))
		const result = await performLogin(
			{ api: { POST: failing } as never, cookies },
			credentials,
		)

		expect(result).toMatchObject({
			ok: false,
			kind: 'unavailable',
			message: messages.unavailable,
		})
		expect(cookies.set).not.toHaveBeenCalled()
	})
})

describe('cookie de sessão', () => {
	it('em produção tem HttpOnly, Secure, SameSite=Lax, Path=/ e Max-Age', () => {
		const header = serialize(
			SESSION_COOKIE,
			TOKEN,
			sessionCookieOptions(true, 28800),
		)
		expect(header).toBe(
			`educare_session=${TOKEN}; Max-Age=28800; Path=/; HttpOnly; Secure; SameSite=Lax`,
		)
	})

	it('em desenvolvimento não tem Secure', () => {
		const header = serialize(
			SESSION_COOKIE,
			TOKEN,
			sessionCookieOptions(false, 28800),
		)
		expect(header).toBe(
			`educare_session=${TOKEN}; Max-Age=28800; Path=/; HttpOnly; SameSite=Lax`,
		)
	})
})

describe('performLogout', () => {
	it('apaga o cookie', () => {
		const cookies = jar(TOKEN)
		expect(performLogout({ cookies })).toEqual({ ok: true })
		expect(cookies.clear).toHaveBeenCalled()
	})
})

describe('fetchSession', () => {
	const me = {
		id: '0b6f3c1e-0000-4000-8000-000000000001',
		name: 'Ana Souza',
		login: 'ana.souza@educare.org',
		role: 'USER',
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
	}

	it('sem cookie devolve sem usuário e não chama a API', async () => {
		const api = vi.fn()
		await expect(fetchSession({ api, cookies: jar() })).resolves.toEqual({
			user: null,
			expired: false,
		})
		expect(api).not.toHaveBeenCalled()
	})

	it('com cookie devolve o usuário de /auth/me com createdAt, sem o token', async () => {
		const api = vi.fn(() => apiReturning(200, me))
		const session = await fetchSession({ api, cookies: jar(TOKEN) })

		expect(api).toHaveBeenCalledWith(TOKEN)
		expect(session).toEqual({
			user: {
				id: me.id,
				name: 'Ana Souza',
				login: 'ana.souza@educare.org',
				role: 'USER',
				createdAt: '2026-01-01T00:00:00Z',
			},
			expired: false,
		})
		expect(JSON.stringify(session)).not.toContain(TOKEN)
	})

	it('com token recusado apaga o cookie e marca a sessão como expirada', async () => {
		const cookies = jar(TOKEN)
		const session = await fetchSession({
			api: () => apiReturning(401, { title: 'Unauthorized', status: 401 }),
			cookies,
		})

		expect(session).toEqual({ user: null, expired: true })
		expect(cookies.clear).toHaveBeenCalled()
	})
})

describe('performChangePassword', () => {
	const values = { currentPassword: 'segredo123', newPassword: 'novaSenha456' }
	const renewed = {
		accessToken: 'eyJhbGciOiJIUzI1NiJ9.token-novo',
		expiresIn: 28800,
		tokenType: 'Bearer',
	}

	it('envia só a senha atual e a nova e grava o token novo do 200', async () => {
		const api = apiReturning(200, renewed)
		const cookies = jar(TOKEN)
		await expect(
			performChangePassword({ api, cookies }, values),
		).resolves.toEqual({ ok: true })
		expect((api as { PUT: ReturnType<typeof vi.fn> }).PUT).toHaveBeenCalledWith(
			'/api/v1/auth/me/password',
			{ body: values },
		)
		expect(cookies.set).toHaveBeenCalledWith(renewed.accessToken, 28800)
	})

	it('no 204 sem corpo devolve ok e mantém o cookie', async () => {
		const cookies = jar(TOKEN)
		await expect(
			performChangePassword({ api: apiReturning(204), cookies }, values),
		).resolves.toEqual({ ok: true })
		expect(cookies.set).not.toHaveBeenCalled()
	})

	it('devolve os erros por campo do 400', async () => {
		const cookies = jar(TOKEN)
		const result = await performChangePassword(
			{
				api: apiReturning(400, {
					title: 'Bad Request',
					status: 400,
					errors: [{ field: 'currentPassword', message: 'está incorreta' }],
				}),
				cookies,
			},
			values,
		)
		expect(result).toMatchObject({
			ok: false,
			fieldErrors: { currentPassword: 'está incorreta' },
		})
		expect(cookies.set).not.toHaveBeenCalled()
	})

	it('devolve a mensagem de muitas tentativas no 429', async () => {
		const result = await performChangePassword(
			{
				api: apiReturning(429, { title: 'Too Many Requests', status: 429 }),
				cookies: jar(TOKEN),
			},
			values,
		)
		expect(result).toMatchObject({
			ok: false,
			kind: 'too-many-requests',
			message: messages.tooManyAttempts,
		})
	})

	it('devolve sem permissão no 403', async () => {
		const result = await performChangePassword(
			{
				api: apiReturning(403, { title: 'Forbidden', status: 403 }),
				cookies: jar(TOKEN),
			},
			values,
		)
		expect(result).toMatchObject({
			ok: false,
			kind: 'forbidden',
			message: messages.forbidden,
		})
	})

	it('deixa o 401 seguir para o middleware', async () => {
		await expect(
			performChangePassword(
				{
					api: apiReturning(401, { title: 'Unauthorized', status: 401 }),
					cookies: jar(TOKEN),
				},
				values,
			),
		).rejects.toMatchObject({ kind: 'unauthorized' })
	})
})
