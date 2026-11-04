import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'
import { z } from 'zod'
import { UsersPending, UsersSection } from '#/components/users/users-section'
import { loadQuery, usersQuery } from '#/integrations/educare-api/queries'

// `?pagina=N` começa em 1; sem o parâmetro, ou com um valor inválido, é a 1.
const searchSchema = z.object({
	pagina: z.number().int().min(1).optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/configuracoes/usuarios')({
	validateSearch: searchSchema,
	loaderDeps: ({ search: { pagina } }) => ({ pagina: pagina ?? 1 }),
	// A lista vem no `loader` (SSR no F5). Ao trocar de página na própria aba,
	// a página anterior continua na tela (`keepPreviousData`) enquanto a nova
	// carrega, em vez de o router mostrar o `pendingComponent`.
	loader: async ({ context: { queryClient }, deps, cause }) => {
		const list = loadQuery(queryClient, usersQuery(deps.pagina))
		if (cause === 'stay') return
		await list
	},
	head: () => ({ meta: [{ title: 'Usuários · Configurações · Educare' }] }),
	pendingComponent: UsersPending,
	component: UsersTab,
})

function UsersTab() {
	const { pagina = 1 } = Route.useSearch()
	const { user } = Route.useRouteContext()
	const navigate = Route.useNavigate()
	const goToPage = useCallback(
		(page: number, options?: { replace?: boolean }) =>
			navigate({
				search: { pagina: page > 1 ? page : undefined },
				replace: options?.replace,
			}),
		[navigate],
	)
	return (
		<UsersSection
			page={pagina}
			onPageChange={goToPage}
			currentUserId={user.id}
		/>
	)
}
