import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'
import { z } from 'zod'
import {
	ChildrenPending,
	ChildrenSection,
} from '#/components/children/children-section'
import {
	childrenQuery,
	classroomsQuery,
	loadQuery,
} from '#/integrations/educare-api/queries'

// Filtros da lista na URL. Um valor inválido é ignorado, como se não
// estivesse lá: `nome` vazio, `turma` que não é um id, `pagina` < 1.
const searchSchema = z.object({
	nome: z
		.string()
		.trim()
		.max(150)
		.transform((value) => value || undefined)
		.optional()
		.catch(undefined),
	turma: z.uuid().optional().catch(undefined),
	pagina: z.number().int().min(1).optional().catch(undefined),
})

type Search = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_authenticated/criancas/')({
	validateSearch: searchSchema,
	loaderDeps: ({ search: { nome, turma, pagina } }) => ({
		nome,
		turma,
		pagina: pagina ?? 1,
	}),
	loader: async ({ context: { queryClient }, deps, cause }) => {
		const list = loadQuery(queryClient, childrenQuery(deps))
		const classrooms = loadQuery(queryClient, classroomsQuery)
		// Ao trocar de página ou de filtro na própria lista, a lista anterior
		// continua na tela (`keepPreviousData`) enquanto a nova carrega.
		if (cause === 'stay') return
		await Promise.all([list, classrooms])
	},
	head: () => ({ meta: [{ title: 'Crianças · Educare' }] }),
	pendingComponent: ChildrenPending,
	component: ChildrenPage,
})

function ChildrenPage() {
	const filters = Route.useLoaderDeps()
	const navigate = Route.useNavigate()

	const change = useCallback(
		(search: Partial<Search>, options?: { replace?: boolean }) =>
			navigate({
				search: (previous) => ({ ...previous, ...search }),
				replace: options?.replace,
			}),
		[navigate],
	)
	const goToPage = useCallback(
		(page: number, options?: { replace?: boolean }) =>
			change({ pagina: page > 1 ? page : undefined }, options),
		[change],
	)
	const search = useCallback(
		(nome: string | undefined) =>
			change({ nome, pagina: undefined }, { replace: true }),
		[change],
	)
	const filterByClassroom = useCallback(
		(turma: string | undefined) => change({ turma, pagina: undefined }),
		[change],
	)

	return (
		<ChildrenSection
			filters={filters}
			onSearch={search}
			onClassroomChange={filterByClassroom}
			onPageChange={goToPage}
		/>
	)
}
