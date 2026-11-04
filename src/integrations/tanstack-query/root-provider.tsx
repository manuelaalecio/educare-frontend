import {
	MutationCache,
	QueryClient,
	type QueryKey,
} from '@tanstack/react-query'

declare module '@tanstack/react-query' {
	interface Register {
		mutationMeta: {
			/** Chaves invalidadas quando a mutation dá certo. */
			invalidates?: readonly QueryKey[]
		}
	}
}

/**
 * Cria o `QueryClient` do app. Uma mutation declara em `meta.invalidates` as
 * chaves que a gravação deixa velhas; no sucesso, elas são invalidadas sem
 * esperar o refetch (a navegação depois de salvar não espera). Uma mutation
 * que falha (por exemplo, com `ApiFieldError`) não invalida nada.
 *
 * Nenhuma consulta tenta de novo sozinha: com o timeout de 10 s da API, o erro
 * (inclusive o `429`) demoraria quase um minuto; a tela oferece "Tentar de novo".
 */
export function createQueryClient() {
	const queryClient: QueryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
		mutationCache: new MutationCache({
			onSuccess: (_data, _variables, _onMutateResult, mutation) => {
				for (const queryKey of mutation.meta?.invalidates ?? []) {
					void queryClient.invalidateQueries({ queryKey })
				}
			},
		}),
	})
	return queryClient
}

export function getContext() {
	const queryClient = createQueryClient()

	return {
		queryClient,
	}
}
export default function TanstackQueryProvider() {}
