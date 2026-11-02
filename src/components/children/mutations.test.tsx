import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiFieldError } from '#/integrations/educare-api/errors'
import {
	createChild,
	deleteChild,
	updateChild,
} from '#/integrations/educare-api/functions'
import { keys } from '#/integrations/educare-api/queries'
import type { ChildRequest } from '#/integrations/educare-api/validation'
import { createQueryClient } from '#/integrations/tanstack-query/root-provider'
import { useCreateChild, useDeleteChild, useUpdateChild } from './mutations'

vi.mock('#/integrations/educare-api/functions', () => ({
	createChild: vi.fn(),
	updateChild: vi.fn(),
	deleteChild: vi.fn(),
}))

vi.mock('@tanstack/react-start', async (importOriginal) => ({
	...(await importOriginal<typeof import('@tanstack/react-start')>()),
	useServerFn: (fn: unknown) => fn,
}))

const id = '7f1d2c3b-4a5e-4f60-8a71-9b8c7d6e5f40'
const body = { name: 'Ana', classroomId: id } as ChildRequest

function setup() {
	const queryClient = createQueryClient()
	const queryKeys = [
		keys.childList({ pagina: 1 }),
		keys.child(id),
		keys.classrooms,
		keys.users,
	]
	for (const key of queryKeys) queryClient.setQueryData(key, 'dados')
	const invalidated = () =>
		queryKeys.filter((key) => queryClient.getQueryState(key)?.isInvalidated)
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
	return { queryClient, invalidated, wrapper }
}

afterEach(() => {
	vi.clearAllMocks()
})

describe('mutations de crianças', () => {
	it('lança ApiFieldError e não invalida nada quando a gravação falha', async () => {
		vi.mocked(createChild).mockResolvedValueOnce({
			ok: false,
			kind: 'conflict',
			fieldErrors: { cpf: 'CPF já cadastrado' },
		})
		const { invalidated, wrapper } = setup()
		const { result } = renderHook(() => useCreateChild(), { wrapper })
		const error = await result.current.mutateAsync(body).catch((e) => e)
		expect(error).toBeInstanceOf(ApiFieldError)
		expect(error.fieldErrors).toEqual({ cpf: 'CPF já cadastrado' })
		expect(invalidated()).toEqual([])
	})

	it('invalida crianças e turmas quando cadastra', async () => {
		vi.mocked(createChild).mockResolvedValueOnce({ ok: true, id })
		const { invalidated, wrapper } = setup()
		const { result } = renderHook(() => useCreateChild(), { wrapper })
		await expect(result.current.mutateAsync(body)).resolves.toEqual({
			ok: true,
			id,
		})
		expect(createChild).toHaveBeenCalledWith({ data: body })
		expect(invalidated()).toEqual([
			keys.childList({ pagina: 1 }),
			keys.child(id),
			keys.classrooms,
		])
	})

	it('envia o id junto com o corpo quando edita', async () => {
		vi.mocked(updateChild).mockResolvedValueOnce({ ok: true, id })
		const { invalidated, wrapper } = setup()
		const { result } = renderHook(() => useUpdateChild(id), { wrapper })
		await result.current.mutateAsync(body)
		expect(updateChild).toHaveBeenCalledWith({ data: { id, ...body } })
		expect(invalidated()).toContainEqual(keys.classrooms)
	})

	it('tira o detalhe do cache quando exclui', async () => {
		vi.mocked(deleteChild).mockResolvedValueOnce({ ok: true })
		const { queryClient, invalidated, wrapper } = setup()
		const { result } = renderHook(() => useDeleteChild(id), { wrapper })
		await result.current.mutateAsync()
		expect(deleteChild).toHaveBeenCalledWith({ data: { id } })
		expect(queryClient.getQueryState(keys.child(id))).toBeUndefined()
		expect(invalidated()).toEqual([
			keys.childList({ pagina: 1 }),
			keys.classrooms,
		])
	})
})
