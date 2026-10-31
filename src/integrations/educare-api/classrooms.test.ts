// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
	createClassroom,
	deleteClassroom,
	listClassrooms,
	renameClassroom,
} from './classrooms'
import { ApiError } from './errors'
import { messages } from './messages'

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

const response = (name: string, studentCount = 0) => ({
	id: ID,
	name,
	studentCount,
	maleCount: 0,
	femaleCount: 0,
	createdAt: '2026-02-02T13:00:00Z',
	updatedAt: '2026-02-03T13:00:00Z',
})

describe('listClassrooms', () => {
	it('devolve as turmas na ordem da API, só com os campos usados', async () => {
		const { api } = apiReturning(200, [
			response('Turma 2', 3),
			response('Turma 1'),
		])
		const result = await listClassrooms(api as never)

		expect(result).toEqual({
			ok: true,
			classrooms: [
				{
					id: ID,
					name: 'Turma 2',
					studentCount: 3,
					maleCount: 0,
					femaleCount: 0,
					createdAt: '2026-02-02T13:00:00Z',
				},
				expect.objectContaining({ name: 'Turma 1' }),
			],
		})
	})

	it('converte o 500 em mensagem de servidor indisponível', async () => {
		const { api } = apiReturning(500, { stack: 'interno' })
		expect(await listClassrooms(api as never)).toEqual({
			ok: false,
			message: messages.unavailable,
		})
	})

	it('converte o 403 na mensagem de permissão', async () => {
		const { api } = apiReturning(403, problem(403))
		expect(await listClassrooms(api as never)).toEqual({
			ok: false,
			message: messages.forbidden,
		})
	})

	it('relança o 401', async () => {
		const { api } = apiReturning(401, problem(401))
		await expect(listClassrooms(api as never)).rejects.toBeInstanceOf(ApiError)
	})
})

describe('createClassroom', () => {
	it('envia o nome sem os espaços das pontas', async () => {
		const { api, call } = apiReturning(201, response('Turma 3'))
		const result = await createClassroom(api as never, { name: '  Turma 3 ' })

		expect(result).toEqual({ ok: true })
		expect(call).toHaveBeenCalledWith('/api/v1/classrooms', {
			body: { name: 'Turma 3' },
		})
	})

	it('converte o 409 em erro no campo, sem mensagem geral', async () => {
		const { api } = apiReturning(409, problem(409))
		expect(await createClassroom(api as never, { name: 'turma 1' })).toEqual({
			ok: false,
			kind: 'conflict',
			message: undefined,
			fieldErrors: { name: messages.classroomNameTaken },
		})
	})

	it('devolve o erro de campo do 400', async () => {
		const { api } = apiReturning(400, {
			title: 'Bad Request',
			status: 400,
			errors: [{ field: 'name', message: 'deve ter no máximo 60 caracteres' }],
		})
		expect(await createClassroom(api as never, { name: 'x' })).toEqual({
			ok: false,
			kind: 'validation',
			message: undefined,
			fieldErrors: { name: 'deve ter no máximo 60 caracteres' },
		})
	})

	it('relança o 401', async () => {
		const { api } = apiReturning(401, problem(401))
		await expect(
			createClassroom(api as never, { name: 'Turma 3' }),
		).rejects.toBeInstanceOf(ApiError)
	})
})

describe('renameClassroom', () => {
	it('envia o id no caminho e o nome sem espaços', async () => {
		const { api, call } = apiReturning(200, response('Maternal A'))
		const result = await renameClassroom(api as never, {
			id: ID,
			name: ' Maternal A ',
		})

		expect(result).toEqual({ ok: true })
		expect(call).toHaveBeenCalledWith('/api/v1/classrooms/{id}', {
			params: { path: { id: ID } },
			body: { name: 'Maternal A' },
		})
	})

	it('converte o 409 em erro no campo', async () => {
		const { api } = apiReturning(409, problem(409))
		const result = await renameClassroom(api as never, {
			id: ID,
			name: 'turma 1',
		})
		expect(result).toMatchObject({
			ok: false,
			kind: 'conflict',
			fieldErrors: { name: messages.classroomNameTaken },
		})
	})

	it('marca o 404 como not-found', async () => {
		const { api } = apiReturning(404, problem(404))
		const result = await renameClassroom(api as never, {
			id: ID,
			name: 'Turma 2',
		})
		expect(result).toMatchObject({ ok: false, kind: 'not-found' })
	})
})

describe('deleteClassroom', () => {
	it('exclui pelo id', async () => {
		const { api, call } = apiReturning(204)
		expect(await deleteClassroom(api as never, { id: ID })).toEqual({
			ok: true,
		})
		expect(call).toHaveBeenCalledWith('/api/v1/classrooms/{id}', {
			params: { path: { id: ID } },
		})
	})

	it('converte o 409 na mensagem de turma com alunos', async () => {
		const { api } = apiReturning(409, problem(409))
		expect(await deleteClassroom(api as never, { id: ID })).toEqual({
			ok: false,
			kind: 'conflict',
			message: messages.classroomHasStudents,
			fieldErrors: {},
		})
	})

	it('marca o 404 como not-found', async () => {
		const { api } = apiReturning(404, problem(404))
		expect(await deleteClassroom(api as never, { id: ID })).toMatchObject({
			ok: false,
			kind: 'not-found',
		})
	})

	it('relança o 401', async () => {
		const { api } = apiReturning(401, problem(401))
		await expect(
			deleteClassroom(api as never, { id: ID }),
		).rejects.toBeInstanceOf(ApiError)
	})
})
