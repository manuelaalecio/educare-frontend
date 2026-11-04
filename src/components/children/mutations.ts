import { useMutation, useQueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ApiFieldError } from '#/integrations/educare-api/errors'
import {
	createChild,
	deleteChild,
	updateChild,
} from '#/integrations/educare-api/functions'
import { invalidates, keysOf } from '#/integrations/educare-api/invalidation'
import { keys } from '#/integrations/educare-api/queries'
import type { ChildRequest } from '#/integrations/educare-api/validation'

// Gravações de crianças. Um `{ ok: false }` vira `ApiFieldError`: a mutation
// falha e o `MutationCache` não invalida nada. No sucesso, ele invalida o que
// a tabela `invalidates` manda (crianças e turmas); nenhum `invalidateQueries`
// aqui.

/**
 * No `401`, o `useServerFn` já navegou para o login e devolve `undefined`.
 * Lançar um redirect faz a mutation falhar sem invalidar nada, e quem chamou
 * reconhece o caso com `isRedirect` e não mostra erro.
 */
function sessionEnded(): never {
	throw redirect({ to: '/login' })
}

export function useCreateChild() {
	const createFn = useServerFn(createChild)
	return useMutation({
		mutationFn: async (body: ChildRequest) => {
			const result = await createFn({ data: body })
			if (!result) sessionEnded()
			if (!result.ok) throw new ApiFieldError(result)
			return result
		},
		meta: { invalidates: keysOf(invalidates.createChild) },
	})
}

export function useUpdateChild(id: string) {
	const updateFn = useServerFn(updateChild)
	return useMutation({
		mutationFn: async (body: ChildRequest) => {
			const result = await updateFn({ data: { id, ...body } })
			if (!result) sessionEnded()
			if (!result.ok) throw new ApiFieldError(result)
			return result
		},
		meta: { invalidates: keysOf(invalidates.updateChild) },
	})
}

/**
 * Além de invalidar, tira o detalhe (e o histórico) do cache: senão a
 * invalidação da raiz buscaria de novo a criança excluída (design, D10). A
 * remoção acontece ainda na `mutationFn`, antes do `onSuccess` do
 * `MutationCache`: com os detalhes na tela, a invalidação faria um refetch
 * (que viria `null`) e piscaria "Criança não encontrada" antes da navegação.
 * `notFound` no resultado indica que ela já não existia.
 */
export function useDeleteChild(id: string) {
	const queryClient = useQueryClient()
	const deleteFn = useServerFn(deleteChild)
	return useMutation({
		mutationFn: async () => {
			const result = await deleteFn({ data: { id } })
			if (!result) sessionEnded()
			if (!result.ok) throw new ApiFieldError(result)
			await queryClient.cancelQueries({ queryKey: keys.child(id) })
			queryClient.removeQueries({ queryKey: keys.child(id) })
			return result
		},
		meta: { invalidates: keysOf(invalidates.deleteChild) },
	})
}
