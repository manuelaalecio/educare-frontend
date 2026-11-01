import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'
import { z } from 'zod'
import { UsersSection } from '#/components/users/users-section'

// `?pagina=N` começa em 1; sem o parâmetro, ou com um valor inválido, é a 1.
const searchSchema = z.object({
	pagina: z.number().int().min(1).optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/configuracoes/usuarios')({
	validateSearch: searchSchema,
	head: () => ({ meta: [{ title: 'Usuários · Configurações · Educare' }] }),
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
