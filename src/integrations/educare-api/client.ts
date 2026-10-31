// Só no servidor: o build falha se este módulo entrar no bundle do navegador.
import '@tanstack/react-start/server-only'
import createClient, { type Middleware } from 'openapi-fetch'
import { env } from '#/env'
import type { paths } from './schema.gen'

export const API_TIMEOUT_MS = 10_000

export type ApiClient = ReturnType<typeof createApiClient>

/**
 * Cliente tipado da API do Educare. O log registra só o método, o caminho do
 * contrato, o status e a duração: nunca o corpo nem os headers (LGPD).
 */
export function createApiClient(token?: string) {
	const client = createClient<paths>({
		baseUrl: env.EDUCARE_API_URL,
		fetch: fetchWithTimeout,
	})
	client.use(logging())
	if (token) client.use(bearer(token))
	return client
}

async function fetchWithTimeout(request: Request) {
	const controller = new AbortController()
	const timer = setTimeout(
		() =>
			controller.abort(
				new DOMException('A API não respondeu a tempo.', 'TimeoutError'),
			),
		API_TIMEOUT_MS,
	)
	try {
		return await globalThis.fetch(request, { signal: controller.signal })
	} finally {
		clearTimeout(timer)
	}
}

function bearer(token: string): Middleware {
	return {
		onRequest({ request }) {
			request.headers.set('Authorization', `Bearer ${token}`)
		},
	}
}

function logging(): Middleware {
	const startedAt = new Map<string, number>()
	const elapsed = (id: string) => {
		const ms = Date.now() - (startedAt.get(id) ?? Date.now())
		startedAt.delete(id)
		return ms
	}
	return {
		onRequest({ id }) {
			startedAt.set(id, Date.now())
		},
		onResponse({ id, request, schemaPath, response }) {
			console.info(
				`[educare-api] ${request.method} ${schemaPath} ${response.status} ${elapsed(id)}ms`,
			)
		},
		onError({ id, request, schemaPath, error }) {
			const reason = error instanceof Error ? error.name : 'erro desconhecido'
			console.warn(
				`[educare-api] ${request.method} ${schemaPath} falhou (${reason}) ${elapsed(id)}ms`,
			)
		},
	}
}
