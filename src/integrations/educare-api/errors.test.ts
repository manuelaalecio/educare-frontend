import { describe, expect, it } from 'vitest'
import { ApiError, toApiError, toFormError, unwrap } from './errors'
import { messages } from './messages'

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
	return promise.then(
		() => {
			throw new Error('deveria ter lançado')
		},
		(error: ApiError) => error,
	)
}

function response(status: number) {
	return new Response(null, { status })
}

describe('toApiError', () => {
	it('converte 400 com errors nos erros por campo', () => {
		const error = toApiError(400, {
			title: 'Bad Request',
			status: 400,
			detail: 'Um ou mais campos são inválidos',
			errors: [
				{ field: 'newPassword', message: 'deve ter entre 8 e 72 caracteres' },
			],
		})
		expect(error.kind).toBe('validation')
		expect(error.fieldErrors).toEqual({
			newPassword: 'deve ter entre 8 e 72 caracteres',
		})
		expect(toFormError(error)).toEqual({
			kind: 'validation',
			message: 'Um ou mais campos são inválidos',
			fieldErrors: { newPassword: 'deve ter entre 8 e 72 caracteres' },
		})
	})

	it('aceita ProblemDetail sem type nem detail', () => {
		const error = toApiError(400, {
			title: 'Bad Request',
			status: 400,
			errors: [{ field: 'login', message: 'é obrigatório' }],
		})
		expect(toFormError(error)).toEqual({
			kind: 'validation',
			message: undefined,
			fieldErrors: { login: 'é obrigatório' },
		})
	})

	it('converte 403 na mensagem de sem permissão', () => {
		const error = toApiError(403, {
			title: 'Forbidden',
			status: 403,
			detail: 'Acesso negado',
		})
		expect(error.kind).toBe('forbidden')
		expect(toFormError(error).message).toBe(messages.forbidden)
	})

	it('converte 500 em indisponível sem repassar o corpo', () => {
		const error = toApiError(500, '<html>NullPointerException at ...</html>')
		expect(toFormError(error)).toEqual({
			kind: 'unavailable',
			message: messages.unavailable,
			fieldErrors: {},
		})
	})

	it('converte 500 com ProblemDetail em indisponível sem o detail', () => {
		const error = toApiError(500, {
			title: 'Internal Server Error',
			status: 500,
			detail: 'could not execute statement',
		})
		expect(toFormError(error).message).toBe(messages.unavailable)
	})

	it('trata JSON sem title nem status como indisponível', () => {
		expect(toApiError(400, { message: 'erro' }).kind).toBe('unavailable')
		expect(toApiError(400, { title: 'Bad Request' }).kind).toBe('unavailable')
	})

	it('reconhece 401, 404 e 409', () => {
		const body = (status: number) => ({ title: 'x', status })
		expect(toApiError(401, body(401)).kind).toBe('unauthorized')
		expect(toApiError(404, body(404)).kind).toBe('not-found')
		expect(toApiError(409, body(409)).kind).toBe('conflict')
	})
})

describe('unwrap', () => {
	it('devolve os dados de uma resposta de sucesso', async () => {
		await expect(
			unwrap(Promise.resolve({ data: { id: '1' }, response: response(200) })),
		).resolves.toEqual({ id: '1' })
	})

	it('lança ApiError com a resposta de erro', async () => {
		const error = await rejection(
			unwrap(
				Promise.resolve({
					error: { title: 'Unauthorized', status: 401 },
					response: response(401),
				}),
			),
		)
		expect(error).toBeInstanceOf(ApiError)
		expect(error.kind).toBe('unauthorized')
	})

	it('converte falha de rede em indisponível', async () => {
		const error = await rejection(
			unwrap(Promise.reject(new TypeError('fetch failed'))),
		)
		expect(toFormError(error).message).toBe(messages.unavailable)
	})

	it('converte timeout em indisponível', async () => {
		const error = await rejection(
			unwrap(Promise.reject(new DOMException('timeout', 'TimeoutError'))),
		)
		expect(error.kind).toBe('unavailable')
	})
})
