import { useMutation } from '@tanstack/react-query'
import { isRedirect, redirect } from '@tanstack/react-router'
import {
	ApiFieldError,
	type FormError,
} from '#/integrations/educare-api/errors'
import {
	keysOf,
	shouldInvalidate,
	type Tag,
} from '#/integrations/educare-api/invalidation'

/** Resultado das gravações de Turmas e Usuários, como os formulários recebem. */
export type FormResult = { ok: true } | ({ ok: false } & FormError)

/**
 * Gravação de um formulário com a invalidação declarada em `meta.invalidates`.
 * O `mutationFn` devolve o resultado no sucesso e no `404` (a lista precisa
 * perder a linha), e lança `ApiFieldError` nos outros `{ ok: false }`: a
 * mutation falha e o `MutationCache` não invalida nada. No `401`, o
 * `useServerFn` já levou ao login e devolve `undefined`; a mutation falha com
 * um redirect, também sem invalidar.
 */
export function useFormMutation<TVariables, TResult extends FormResult>(
	call: (variables: TVariables) => Promise<TResult | undefined>,
	tags: readonly Tag[],
) {
	return useMutation({
		mutationFn: async (variables: TVariables) => {
			const result = await call(variables)
			if (!result) throw redirect({ to: '/login' })
			if (!shouldInvalidate(result)) {
				throw new ApiFieldError(result as FormError)
			}
			return result
		},
		meta: { invalidates: keysOf(tags) },
	})
}

/**
 * Converte a falha da mutation de volta no resultado que o formulário trata
 * (erros nos campos e alerta). Na sessão encerrada, devolve um resultado sem
 * mensagem: a navegação para o login já está acontecendo.
 */
export async function formResult<TResult extends FormResult>(
	mutation: Promise<TResult>,
): Promise<TResult | ({ ok: false } & FormError)> {
	try {
		return await mutation
	} catch (error) {
		if (error instanceof ApiFieldError) {
			return {
				ok: false,
				kind: error.kind,
				message: error.message || undefined,
				fieldErrors: error.fieldErrors,
			}
		}
		if (isRedirect(error)) {
			return { ok: false, kind: 'unauthorized', fieldErrors: {} }
		}
		throw error
	}
}
