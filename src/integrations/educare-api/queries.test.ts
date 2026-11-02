import { MutationObserver, queryOptions } from '@tanstack/react-query'
import {
	isNotFound,
	isRedirect,
	notFound,
	redirect,
} from '@tanstack/react-router'
import { describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '#/integrations/tanstack-query/root-provider'
import { ApiFieldError } from './errors'
import { getChild, getChildren } from './functions'
import {
	childQuery,
	childrenQuery,
	classroomsQuery,
	currentUserQuery,
	keys,
	loadQuery,
	usersQuery,
	usersQueryKey,
} from './queries'

vi.mock('./functions', () => ({
	getChild: vi.fn(),
	getChildClassrooms: vi.fn(),
	getChildren: vi.fn(),
	getClassrooms: vi.fn(),
	getCurrentUser: vi.fn(),
	getUsers: vi.fn(),
}))

describe('keys', () => {
	it('mantém as chaves de sessão, turmas e usuários', () => {
		expect(keys.session).toEqual(['educare-api', 'session'])
		expect(keys.classrooms).toEqual(['educare-api', 'classrooms'])
		expect(keys.users).toEqual(['educare-api', 'users'])
		expect(usersQueryKey).toEqual(['educare-api', 'users'])
		expect(currentUserQuery.queryKey).toEqual(keys.session)
		expect(classroomsQuery.queryKey).toEqual(keys.classrooms)
		expect(usersQuery(2).queryKey).toEqual(['educare-api', 'users', 2])
	})

	it('guarda as turmas por 5 minutos', () => {
		expect(classroomsQuery.staleTime).toBe(5 * 60_000)
	})

	it('põe lista, detalhe e histórico de crianças sob keys.children', () => {
		const filters = { nome: 'Ana', pagina: 2 }
		expect(keys.children).toEqual(['educare-api', 'children'])
		expect(keys.childList(filters)).toEqual([
			'educare-api',
			'children',
			'list',
			filters,
		])
		expect(keys.child('c1')).toEqual([
			'educare-api',
			'children',
			'detail',
			'c1',
		])
		expect(keys.childClassrooms('c1')).toEqual([
			...keys.child('c1'),
			'classrooms',
		])
	})
})

function seed() {
	const queryClient = createQueryClient()
	const queryKeys = [
		keys.childList({ pagina: 1 }),
		keys.child('c1'),
		keys.classrooms,
		keys.users,
	]
	for (const key of queryKeys) queryClient.setQueryData(key, 'dados')
	const invalidated = () =>
		queryKeys.filter((key) => queryClient.getQueryState(key)?.isInvalidated)
	return { queryClient, invalidated }
}

describe('MutationCache', () => {
	it('invalida só as chaves de meta.invalidates quando dá certo', async () => {
		const { queryClient, invalidated } = seed()
		const observer = new MutationObserver(queryClient, {
			mutationFn: async () => 'ok',
			meta: { invalidates: [keys.children, keys.classrooms] },
		})
		await observer.mutate()
		expect(invalidated()).toEqual([
			keys.childList({ pagina: 1 }),
			keys.child('c1'),
			keys.classrooms,
		])
	})

	it('não invalida nada quando a mutation lança ApiFieldError', async () => {
		const { queryClient, invalidated } = seed()
		const observer = new MutationObserver(queryClient, {
			mutationFn: async () => {
				throw new ApiFieldError({
					kind: 'conflict',
					message: 'CPF já cadastrado',
					fieldErrors: { cpf: 'CPF já cadastrado' },
				})
			},
			meta: { invalidates: [keys.children, keys.classrooms] },
		})
		await expect(observer.mutate()).rejects.toBeInstanceOf(ApiFieldError)
		expect(invalidated()).toEqual([])
	})
})

describe('ApiFieldError', () => {
	it('carrega kind, mensagem e erros por campo', () => {
		const error = new ApiFieldError({
			kind: 'validation',
			fieldErrors: { name: 'obrigatório' },
		})
		expect(error).toBeInstanceOf(Error)
		expect(error.kind).toBe('validation')
		expect(error.message).toBe('')
		expect(error.fieldErrors).toEqual({ name: 'obrigatório' })
	})
})

describe('loadQuery', () => {
	function counted(queryFn: () => Promise<string> = async () => 'novo') {
		const fn = vi.fn(queryFn)
		const options = queryOptions({
			queryKey: keys.child('c1'),
			queryFn: fn,
			staleTime: 60_000,
			retry: false,
		})
		return { fn, options }
	}

	it('busca quando não há cache', async () => {
		const queryClient = createQueryClient()
		const { fn, options } = counted()
		await loadQuery(queryClient, options)
		expect(fn).toHaveBeenCalledTimes(1)
		expect(queryClient.getQueryData(options.queryKey)).toBe('novo')
	})

	it('não busca quando os dados estão frescos', async () => {
		const queryClient = createQueryClient()
		const { fn, options } = counted()
		queryClient.setQueryData(options.queryKey, 'antigo')
		await loadQuery(queryClient, options)
		expect(fn).not.toHaveBeenCalled()
	})

	it('espera a busca quando a consulta foi invalidada', async () => {
		const queryClient = createQueryClient()
		const { fn, options } = counted()
		queryClient.setQueryData(options.queryKey, 'antigo')
		await queryClient.invalidateQueries({ queryKey: keys.children })
		await loadQuery(queryClient, options)
		expect(fn).toHaveBeenCalledTimes(1)
		expect(queryClient.getQueryData(options.queryKey)).toBe('novo')
	})

	it('não lança erro da busca e deixa a consulta em erro', async () => {
		const queryClient = createQueryClient()
		const { options } = counted(async () => {
			throw new Error('indisponível')
		})
		await expect(loadQuery(queryClient, options)).resolves.toBeUndefined()
		expect(queryClient.getQueryState(options.queryKey)?.status).toBe('error')
	})

	it('relança o redirecionamento da sessão expirada', async () => {
		const queryClient = createQueryClient()
		const { options } = counted(async () => {
			throw redirect({ to: '/login' })
		})
		const error = await loadQuery(queryClient, options).catch((e) => e)
		expect(isRedirect(error)).toBe(true)
	})

	it('relança notFound()', async () => {
		const queryClient = createQueryClient()
		const { options } = counted(async () => {
			throw notFound()
		})
		const error = await loadQuery(queryClient, options).catch((e) => e)
		expect(isNotFound(error)).toBe(true)
	})
})

describe('consultas de crianças', () => {
	const id = '7f1d2c3b-4a5e-4f60-8a71-9b8c7d6e5f40'

	it('childQuery devolve null sem chamar a API quando o id não é UUID', async () => {
		const queryClient = createQueryClient()
		await expect(queryClient.fetchQuery(childQuery('abc'))).resolves.toBeNull()
		expect(getChild).not.toHaveBeenCalled()
	})

	it('childQuery busca pelo id e fica em erro com a mensagem', async () => {
		vi.mocked(getChild).mockResolvedValueOnce({
			ok: false,
			message: 'indisponível',
		})
		const queryClient = createQueryClient()
		await expect(queryClient.fetchQuery(childQuery(id))).rejects.toThrow(
			'indisponível',
		)
		expect(getChild).toHaveBeenCalledWith({ data: { id } })
	})

	it('childrenQuery usa keys.childList e passa os filtros', async () => {
		const filters = { nome: 'Ana', pagina: 2 }
		const page = { number: 1, size: 20, totalElements: 21, totalPages: 2 }
		vi.mocked(getChildren).mockResolvedValueOnce({
			ok: true,
			children: [],
			page,
		})
		const options = childrenQuery(filters)
		expect(options.queryKey).toEqual(keys.childList(filters))
		expect(options.staleTime).toBe(60_000)
		const queryClient = createQueryClient()
		await expect(queryClient.fetchQuery(options)).resolves.toEqual({
			children: [],
			page,
		})
		expect(getChildren).toHaveBeenCalledWith({ data: filters })
	})
})
