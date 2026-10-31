// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_TIMEOUT_MS, createApiClient } from './client'

const fetchMock =
	vi.fn<(request: Request, init?: RequestInit) => Promise<Response>>()

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}

beforeEach(() => {
	vi.stubGlobal('fetch', fetchMock)
	vi.spyOn(console, 'info').mockImplementation(() => {})
	vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
	fetchMock.mockReset()
	vi.useRealTimers()
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

function logged() {
	return [
		...vi.mocked(console.info).mock.calls,
		...vi.mocked(console.warn).mock.calls,
	]
		.flat()
		.join('\n')
}

describe('createApiClient', () => {
	it('chama a URL do env com o caminho do contrato', async () => {
		fetchMock.mockResolvedValue(
			json({ accessToken: 't', tokenType: 'Bearer', expiresIn: 28800 }),
		)
		await createApiClient().POST('/api/v1/auth/login', {
			body: { login: 'admin@educare.org', password: 'educare123' },
		})
		expect(fetchMock.mock.calls[0][0].url).toBe(
			'http://localhost:8080/api/v1/auth/login',
		)
	})

	it('envia o Authorization só quando há token', async () => {
		fetchMock.mockImplementation(async () => json({}))
		await createApiClient('token-da-sessao').GET('/api/v1/auth/me')
		await createApiClient().GET('/api/v1/auth/me')

		const [withToken, withoutToken] = fetchMock.mock.calls.map(
			([request]) => request,
		)
		expect(withToken.headers.get('Authorization')).toBe(
			'Bearer token-da-sessao',
		)
		expect(withoutToken.headers.has('Authorization')).toBe(false)
	})

	it('aborta a chamada sem resposta em 10 segundos', async () => {
		vi.useFakeTimers()
		fetchMock.mockImplementation(
			(_request, init) =>
				new Promise((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () =>
						reject(init.signal?.reason),
					)
				}),
		)
		const call = createApiClient().GET('/api/v1/auth/me')
		const rejection = expect(call).rejects.toMatchObject({
			name: 'TimeoutError',
		})

		await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS - 1)
		expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false)
		await vi.advanceTimersByTimeAsync(1)
		await rejection
	})

	it('registra a falha de rede sem email, senha nem token', async () => {
		fetchMock.mockRejectedValue(new TypeError('fetch failed'))
		await expect(
			createApiClient('token-da-sessao').POST('/api/v1/auth/login', {
				body: { login: 'ana.souza@educare.org', password: 'segredo123' },
			}),
		).rejects.toThrow()

		const log = logged()
		expect(log).toContain('POST /api/v1/auth/login falhou (TypeError)')
		expect(log).not.toContain('ana.souza')
		expect(log).not.toContain('segredo123')
		expect(log).not.toContain('token-da-sessao')
	})

	it('registra método, caminho e status da resposta', async () => {
		fetchMock.mockResolvedValue(
			json({ title: 'Unauthorized', status: 401 }, 401),
		)
		await createApiClient('token-da-sessao').GET('/api/v1/auth/me')
		expect(logged()).toMatch(/GET \/api\/v1\/auth\/me 401 \d+ms/)
		expect(logged()).not.toContain('token-da-sessao')
	})
})
