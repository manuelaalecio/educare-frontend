// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from './errors'
import { messages } from './messages'
import {
	createUser,
	deleteUser,
	listUsers,
	resetUserPassword,
	updateUser,
} from './users'

const ID = '7d3f1c2a-1b2c-4d5e-8f90-a1b2c3d4e5f6'

function reply(status: number, body?: unknown) {
	const response = new Response(null, { status })
	return Promise.resolve(
		response.ok ? { data: body, response } : { error: body, response },
	)
}

function apiReturning(status: number, body?: unknown) {
	const call = vi.fn((..._args: unknown[]) => reply(status, body))
	return { call, api: { GET: call, POST: call, PUT: call, DELETE: call } }
}

const problem = (status: number, extra: Record<string, unknown> = {}) => ({
	title: 'Erro',
	status,
	detail: 'Detalhe vindo da API',
	...extra,
})

const carlos = {
	id: ID,
	name: 'Carlos Lima',
	login: 'carlos.lima@educare.org',
	role: 'EDUCADOR',
	createdAt: '2026-03-20T13:00:00Z',
	updatedAt: '2026-03-21T13:00:00Z',
}

const edit = {
	id: ID,
	name: 'Carlos Lima',
	login: 'carlos.lima@educare.org',
	role: 'EDUCADOR' as const,
	currentRole: 'EDUCADOR',
	currentLogin: 'carlos.lima@educare.org',
}

describe('listUsers', () => {
	it('pede a página à API começando em 0 e devolve só os campos usados', async () => {
		const { api, call } = apiReturning(200, {
			content: [carlos],
			page: { number: 1, size: 20, totalElements: 21, totalPages: 2 },
		})
		const result = await listUsers(api as never, { page: 2 })

		expect(call).toHaveBeenCalledWith('/api/v1/users', {
			params: { query: { page: 1 } },
		})
		expect(result).toEqual({
			ok: true,
			users: [
				{
					id: ID,
					name: 'Carlos Lima',
					login: 'carlos.lima@educare.org',
					role: 'EDUCADOR',
					createdAt: '2026-03-20T13:00:00Z',
				},
			],
			page: { number: 1, size: 20, totalElements: 21, totalPages: 2 },
		})
	})

	it('converte o 500 em mensagem de servidor indisponível', async () => {
		const { api } = apiReturning(500, { stack: 'interno' })
		expect(await listUsers(api as never, { page: 1 })).toEqual({
			ok: false,
			message: messages.unavailable,
		})
	})

	it('relança o 401', async () => {
		const { api } = apiReturning(401, problem(401))
		await expect(listUsers(api as never, { page: 1 })).rejects.toBeInstanceOf(
			ApiError,
		)
	})
})

describe('createUser', () => {
	const values = {
		name: '  Mariana Alves ',
		login: ' mariana.alves@educare.org ',
		password: 'senha-forte-1',
		role: 'EDUCADOR' as const,
	}

	it('envia os dados sem espaços nas pontas', async () => {
		const { api, call } = apiReturning(201, carlos)
		expect(await createUser(api as never, values)).toEqual({ ok: true })
		expect(call).toHaveBeenCalledWith('/api/v1/users', {
			body: {
				name: 'Mariana Alves',
				login: 'mariana.alves@educare.org',
				password: 'senha-forte-1',
				role: 'EDUCADOR',
			},
		})
	})

	it('converte o 409 em erro no campo Email', async () => {
		const { api } = apiReturning(409, problem(409))
		expect(await createUser(api as never, values)).toEqual({
			ok: false,
			kind: 'conflict',
			message: undefined,
			fieldErrors: { login: messages.userEmailTaken },
		})
	})

	it('repassa os erros de campo do 400', async () => {
		const { api } = apiReturning(400, {
			title: 'Bad Request',
			status: 400,
			errors: [
				{
					field: 'login',
					message: 'deve ser um email no formato nome@dominio.tld',
				},
				{ field: 'password', message: 'deve ter entre 8 e 72 caracteres' },
			],
		})
		expect(await createUser(api as never, values)).toEqual({
			ok: false,
			kind: 'validation',
			message: undefined,
			fieldErrors: {
				login: 'deve ser um email no formato nome@dominio.tld',
				password: 'deve ter entre 8 e 72 caracteres',
			},
		})
	})

	it('relança o 401', async () => {
		const { api } = apiReturning(401, problem(401))
		await expect(createUser(api as never, values)).rejects.toBeInstanceOf(
			ApiError,
		)
	})
})

describe('updateUser', () => {
	it('envia nome, email e função, sem os dados de antes', async () => {
		const { api, call } = apiReturning(200, carlos)
		expect(await updateUser(api as never, edit)).toEqual({ ok: true })
		expect(call).toHaveBeenCalledWith('/api/v1/users/{id}', {
			params: { path: { id: ID } },
			body: {
				name: 'Carlos Lima',
				login: 'carlos.lima@educare.org',
				role: 'EDUCADOR',
			},
		})
	})

	it('sem perder a função de coordenador, o 409 é o email', async () => {
		const { api } = apiReturning(409, problem(409))
		const result = await updateUser(api as never, {
			...edit,
			login: 'ana.souza@educare.org',
		})
		expect(result).toMatchObject({
			ok: false,
			message: undefined,
			fieldErrors: { login: messages.userEmailTaken },
		})
	})

	it('rebaixando o coordenador sem mudar o email, o 409 é o último coordenador', async () => {
		const { api } = apiReturning(409, problem(409))
		const result = await updateUser(api as never, {
			...edit,
			login: ' Carlos.Lima@educare.org',
			currentRole: 'COORDENADOR',
		})
		expect(result).toMatchObject({
			ok: false,
			message: messages.lastCoordinator,
			fieldErrors: {},
		})
	})

	it('mudando email e função, mostra o detalhe da API', async () => {
		const { api } = apiReturning(409, problem(409))
		const result = await updateUser(api as never, {
			...edit,
			login: 'outro@educare.org',
			currentRole: 'COORDENADOR',
		})
		expect(result).toMatchObject({
			ok: false,
			message: 'Detalhe vindo da API',
			fieldErrors: {},
		})
	})

	it('converte o 404', async () => {
		const { api } = apiReturning(404, problem(404))
		expect(await updateUser(api as never, edit)).toMatchObject({
			ok: false,
			kind: 'not-found',
		})
	})
})

describe('resetUserPassword', () => {
	const values = {
		id: ID,
		newPassword: 'senha-forte-1',
		confirmPassword: 'senha-forte-1',
	}

	it('envia só a senha nova', async () => {
		const { api, call } = apiReturning(204)
		expect(await resetUserPassword(api as never, values)).toEqual({ ok: true })
		expect(call).toHaveBeenCalledWith('/api/v1/users/{id}/password', {
			params: { path: { id: ID } },
			body: { password: 'senha-forte-1' },
		})
	})

	it('leva o erro de password da API para o campo Nova senha', async () => {
		const { api } = apiReturning(400, {
			title: 'Bad Request',
			status: 400,
			errors: [
				{ field: 'password', message: 'deve ter entre 8 e 72 caracteres' },
			],
		})
		expect(await resetUserPassword(api as never, values)).toMatchObject({
			ok: false,
			fieldErrors: { newPassword: 'deve ter entre 8 e 72 caracteres' },
		})
	})

	it('não repete a senha no resultado de erro', async () => {
		const { api } = apiReturning(500)
		const result = await resetUserPassword(api as never, values)
		expect(JSON.stringify(result)).not.toContain('senha-forte-1')
	})
})

describe('deleteUser', () => {
	it('exclui pelo id', async () => {
		const { api, call } = apiReturning(204)
		expect(await deleteUser(api as never, { id: ID })).toEqual({ ok: true })
		expect(call).toHaveBeenCalledWith('/api/v1/users/{id}', {
			params: { path: { id: ID } },
		})
	})

	it('converte o 409 no último coordenador', async () => {
		const { api } = apiReturning(409, problem(409))
		expect(await deleteUser(api as never, { id: ID })).toMatchObject({
			ok: false,
			kind: 'conflict',
			message: messages.lastCoordinator,
		})
	})

	it('converte o 404', async () => {
		const { api } = apiReturning(404, problem(404))
		expect(await deleteUser(api as never, { id: ID })).toMatchObject({
			ok: false,
			kind: 'not-found',
		})
	})

	it('relança o 401', async () => {
		const { api } = apiReturning(401, problem(401))
		await expect(deleteUser(api as never, { id: ID })).rejects.toBeInstanceOf(
			ApiError,
		)
	})
})
