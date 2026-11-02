// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
	type ChildBody,
	conflictField,
	createChild,
	deleteChild,
	getChild,
	listChildClassrooms,
	listChildren,
	updateChild,
} from './children'
import { ApiError } from './errors'
import { messages } from './messages'

const ID = '7d3f1c2a-1b2c-4d5e-8f90-a1b2c3d4e5f6'
const CLASSROOM_ID = '1a2b3c4d-1b2c-4d5e-8f90-a1b2c3d4e5f6'

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

const classroom = { id: CLASSROOM_ID, name: 'Turma 1' }

const ana = {
	id: ID,
	name: 'Ana Lima',
	birthDate: '2020-05-10',
	cpf: '52998224725',
	rg: '123456',
	birthCertificateNumber: '12345678901234567890123456789012',
	cep: '01001000',
	address: 'Rua A',
	addressNumber: '10',
	neighborhood: 'Centro',
	city: 'São Paulo',
	state: 'SP',
	healthReport: 'Alergia',
	classroom,
	createdAt: '2026-03-20T13:00:00Z',
	updatedAt: '2026-03-21T13:00:00Z',
}

const body: ChildBody = {
	name: 'Ana Lima',
	birthDate: '2020-05-10',
	classroomId: CLASSROOM_ID,
	cep: '01001000',
	address: 'Rua A',
	addressNumber: '10',
	neighborhood: 'Centro',
	city: 'São Paulo',
	state: 'SP',
	cpf: '52998224725',
}

describe('listChildren', () => {
	const pageBody = {
		content: [ana],
		page: { number: 1, size: 20, totalElements: 21, totalPages: 2 },
	}

	it('pede a página começando em 0, com os filtros, tamanho e ordem', async () => {
		const { api, call } = apiReturning(200, pageBody)
		await listChildren(api as never, {
			nome: 'ana',
			turma: CLASSROOM_ID,
			pagina: 2,
		})

		expect(call).toHaveBeenCalledWith('/api/v1/children', {
			params: {
				query: {
					name: 'ana',
					classroomId: CLASSROOM_ID,
					page: 1,
					size: 20,
					sort: 'name',
				},
			},
		})
	})

	it('sem filtros, não envia nome nem turma', async () => {
		const { api, call } = apiReturning(200, pageBody)
		await listChildren(api as never, { pagina: 1 })

		const query = (call.mock.calls[0]?.[1] as { params: { query: object } })
			.params.query
		expect(JSON.parse(JSON.stringify(query))).toEqual({
			page: 0,
			size: 20,
			sort: 'name',
		})
	})

	it('corta cada criança para o resumo, mesmo que a API mande mais', async () => {
		const { api } = apiReturning(200, pageBody)
		const result = await listChildren(api as never, { pagina: 2 })

		expect(result).toEqual({
			ok: true,
			children: [
				{
					id: ID,
					name: 'Ana Lima',
					birthDate: '2020-05-10',
					classroom: { id: CLASSROOM_ID, name: 'Turma 1' },
				},
			],
			page: { number: 1, size: 20, totalElements: 21, totalPages: 2 },
		})
		if (!result.ok) throw new Error('esperava sucesso')
		const [child] = result.children
		expect(Object.keys(child ?? {}).sort()).toEqual([
			'birthDate',
			'classroom',
			'id',
			'name',
		])
		expect(JSON.stringify(result)).not.toContain('52998224725')
	})

	it('converte o 500 em mensagem de servidor indisponível', async () => {
		const { api } = apiReturning(500, { stack: 'interno' })
		expect(await listChildren(api as never, { pagina: 1 })).toEqual({
			ok: false,
			message: messages.unavailable,
		})
	})

	it('relança o 401', async () => {
		const { api } = apiReturning(401, problem(401))
		await expect(
			listChildren(api as never, { pagina: 1 }),
		).rejects.toBeInstanceOf(ApiError)
	})
})

describe('getChild', () => {
	it('devolve os dados da criança', async () => {
		const { api, call } = apiReturning(200, { ...ana, internal: 'x' })
		const result = await getChild(api as never, { id: ID })

		expect(call).toHaveBeenCalledWith('/api/v1/children/{id}', {
			params: { path: { id: ID } },
		})
		expect(result).toEqual({ ok: true, child: ana })
		expect(JSON.stringify(result)).not.toContain('internal')
	})

	it('devolve null no 404', async () => {
		const { api } = apiReturning(404, problem(404))
		expect(await getChild(api as never, { id: ID })).toEqual({
			ok: true,
			child: null,
		})
	})

	it('converte o 403 na mensagem de permissão', async () => {
		const { api } = apiReturning(403, problem(403))
		expect(await getChild(api as never, { id: ID })).toEqual({
			ok: false,
			message: messages.forbidden,
		})
	})

	it('relança o 401', async () => {
		const { api } = apiReturning(401, problem(401))
		await expect(getChild(api as never, { id: ID })).rejects.toBeInstanceOf(
			ApiError,
		)
	})
})

describe('listChildClassrooms', () => {
	it('ordena do período mais recente para o mais antigo', async () => {
		const { api, call } = apiReturning(200, [
			{
				classroomId: 'a',
				classroomName: 'Turma A',
				startDate: '2024-02-01',
				endDate: '2025-01-31',
			},
			{ classroomId: 'c', classroomName: 'Turma C', startDate: '2026-02-01' },
			{
				classroomId: 'b',
				classroomName: 'Turma B',
				startDate: '2025-02-01',
				endDate: '2026-01-31',
			},
		])
		const result = await listChildClassrooms(api as never, { id: ID })

		expect(call).toHaveBeenCalledWith('/api/v1/children/{id}/classrooms', {
			params: { path: { id: ID } },
		})
		expect(result).toEqual({
			ok: true,
			periods: [
				{
					classroomId: 'c',
					classroomName: 'Turma C',
					startDate: '2026-02-01',
					endDate: null,
				},
				{
					classroomId: 'b',
					classroomName: 'Turma B',
					startDate: '2025-02-01',
					endDate: '2026-01-31',
				},
				{
					classroomId: 'a',
					classroomName: 'Turma A',
					startDate: '2024-02-01',
					endDate: '2025-01-31',
				},
			],
		})
	})

	it('no mesmo início, o período atual vem antes', async () => {
		const { api } = apiReturning(200, [
			{
				classroomId: 'a',
				classroomName: 'Turma A',
				startDate: '2026-02-01',
				endDate: '2026-02-01',
			},
			{ classroomId: 'b', classroomName: 'Turma B', startDate: '2026-02-01' },
		])
		const result = await listChildClassrooms(api as never, { id: ID })
		if (!result.ok) throw new Error('esperava sucesso')
		expect(result.periods.map((period) => period.classroomId)).toEqual([
			'b',
			'a',
		])
	})

	it('relança o 401', async () => {
		const { api } = apiReturning(401, problem(401))
		await expect(
			listChildClassrooms(api as never, { id: ID }),
		).rejects.toBeInstanceOf(ApiError)
	})
})

describe('conflictField', () => {
	it('reconhece o CPF, o RG e a certidão', () => {
		expect(conflictField('CPF já cadastrado')).toEqual({
			field: 'cpf',
			message: messages.childCpfTaken,
		})
		expect(conflictField('RG já cadastrado')).toEqual({
			field: 'rg',
			message: messages.childRgTaken,
		})
		expect(conflictField('Matrícula da certidão já cadastrada')).toEqual({
			field: 'birthCertificateNumber',
			message: messages.childCertificateTaken,
		})
		expect(conflictField('CERTIDÃO já cadastrada')).toEqual(
			expect.objectContaining({ field: 'birthCertificateNumber' }),
		)
	})

	it('confere o CPF antes do RG', () => {
		expect(conflictField('CPF e RG já cadastrados')).toEqual(
			expect.objectContaining({ field: 'cpf' }),
		)
	})

	it('não acha "RG" dentro de outras palavras', () => {
		expect(conflictField('ÓRGÃO EMISSOR inválido')).toBeNull()
		expect(conflictField('CARGO ocupado')).toBeNull()
		expect(conflictField('Registro em uso')).toBeNull()
	})

	it('devolve null sem correspondência ou sem detail', () => {
		expect(conflictField('Outro conflito')).toBeNull()
		expect(conflictField(undefined)).toBeNull()
	})
})

describe('createChild', () => {
	it('envia o corpo e devolve o id criado', async () => {
		const { api, call } = apiReturning(201, ana)
		const result = await createChild(api as never, body)

		expect(result).toEqual({ ok: true, id: ID })
		expect(call).toHaveBeenCalledWith('/api/v1/children', { body })
	})

	it.each([
		['CPF já cadastrado', 'cpf', messages.childCpfTaken],
		['RG já cadastrado', 'rg', messages.childRgTaken],
		[
			'Matrícula da certidão já cadastrada',
			'birthCertificateNumber',
			messages.childCertificateTaken,
		],
	])('converte o 409 "%s" em erro no campo %s', async (detail, field, text) => {
		const { api } = apiReturning(409, problem(409, { detail }))
		expect(await createChild(api as never, body)).toEqual({
			ok: false,
			kind: 'conflict',
			message: undefined,
			fieldErrors: { [field]: text },
		})
	})

	it('mostra o 409 desconhecido como alerta com o detail', async () => {
		const { api } = apiReturning(409, problem(409, { detail: 'Outro motivo' }))
		expect(await createChild(api as never, body)).toEqual({
			ok: false,
			kind: 'conflict',
			message: 'Outro motivo',
			fieldErrors: {},
		})
	})

	it('devolve os erros de campo do 400, inclusive a turma', async () => {
		const { api } = apiReturning(400, {
			title: 'Bad Request',
			status: 400,
			errors: [
				{ field: 'classroomId', message: 'Turma não encontrada' },
				{ field: 'name', message: 'não deve estar em branco' },
			],
		})
		expect(await createChild(api as never, body)).toEqual({
			ok: false,
			kind: 'validation',
			message: undefined,
			fieldErrors: {
				classroomId: 'Turma não encontrada',
				name: 'não deve estar em branco',
			},
		})
	})

	it('relança o 401', async () => {
		const { api } = apiReturning(401, problem(401))
		await expect(createChild(api as never, body)).rejects.toBeInstanceOf(
			ApiError,
		)
	})
})

describe('updateChild', () => {
	it('substitui a criança inteira com PUT, sem o id no corpo', async () => {
		const { api, call } = apiReturning(200, ana)
		const result = await updateChild(api as never, { id: ID, ...body })

		expect(result).toEqual({ ok: true, id: ID })
		expect(call).toHaveBeenCalledWith('/api/v1/children/{id}', {
			params: { path: { id: ID } },
			body,
		})
	})

	it('converte o 409 de RG em erro no campo', async () => {
		const { api } = apiReturning(
			409,
			problem(409, { detail: 'RG já cadastrado' }),
		)
		expect(await updateChild(api as never, { id: ID, ...body })).toEqual({
			ok: false,
			kind: 'conflict',
			message: undefined,
			fieldErrors: { rg: messages.childRgTaken },
		})
	})

	it('converte o 404 na mensagem de criança inexistente', async () => {
		const { api } = apiReturning(404, problem(404))
		expect(await updateChild(api as never, { id: ID, ...body })).toEqual({
			ok: false,
			kind: 'not-found',
			message: messages.childNotFound,
			fieldErrors: {},
		})
	})

	it('relança o 401', async () => {
		const { api } = apiReturning(401, problem(401))
		await expect(
			updateChild(api as never, { id: ID, ...body }),
		).rejects.toBeInstanceOf(ApiError)
	})
})

describe('deleteChild', () => {
	it('exclui a criança', async () => {
		const { api, call } = apiReturning(204)
		expect(await deleteChild(api as never, { id: ID })).toEqual({ ok: true })
		expect(call).toHaveBeenCalledWith('/api/v1/children/{id}', {
			params: { path: { id: ID } },
		})
	})

	it('trata o 404 como sucesso, avisando que a criança não existia', async () => {
		const { api } = apiReturning(404, problem(404))
		expect(await deleteChild(api as never, { id: ID })).toEqual({
			ok: true,
			notFound: true,
		})
	})

	it('converte o 403 na mensagem de permissão', async () => {
		const { api } = apiReturning(403, problem(403))
		expect(await deleteChild(api as never, { id: ID })).toEqual({
			ok: false,
			kind: 'forbidden',
			message: messages.forbidden,
			fieldErrors: {},
		})
	})

	it('relança o 401', async () => {
		const { api } = apiReturning(401, problem(401))
		await expect(deleteChild(api as never, { id: ID })).rejects.toBeInstanceOf(
			ApiError,
		)
	})
})
