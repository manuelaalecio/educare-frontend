import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ArrowLeft, CircleAlert } from 'lucide-react'
import { ChildDetails } from '#/components/children/child-details'
import {
	CHILD_NOT_FOUND_TITLE,
	ChildNotFound,
} from '#/components/children/child-not-found'
import { isNotFound } from '#/components/layout/not-found'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
	childClassroomsQuery,
	childQuery,
	loadQuery,
} from '#/integrations/educare-api/queries'
import {
	COORDINATOR_ROLE,
	childIdSchema,
} from '#/integrations/educare-api/validation'

// Detalhes de uma criança. O título da aba nunca tem o nome (LGPD).
export const Route = createFileRoute('/_authenticated/criancas/$childId/')({
	loader: async ({ context: { queryClient }, params: { childId } }) => {
		const validId = childIdSchema.safeParse({ id: childId }).success
		await Promise.all([
			loadQuery(queryClient, childQuery(childId)),
			validId && loadQuery(queryClient, childClassroomsQuery(childId)),
		])
		if (queryClient.getQueryData(childQuery(childId).queryKey) === null) {
			throw notFound()
		}
	},
	head: ({ match }) => ({
		meta: [
			{
				title: isNotFound([match])
					? CHILD_NOT_FOUND_TITLE
					: 'Criança · Educare',
			},
		],
	}),
	notFoundComponent: ChildNotFound,
	component: ChildDetailsPage,
})

function ChildDetailsPage() {
	const { childId } = Route.useParams()
	const { user } = Route.useRouteContext()
	const query = useQuery(childQuery(childId))

	if (query.isError) {
		return (
			<main className='flex flex-col items-start gap-4 p-4 md:p-8'>
				<Button asChild variant='ghost' className='h-11 px-2'>
					<Link to='/criancas'>
						<ArrowLeft aria-hidden='true' />
						Voltar para Crianças
					</Link>
				</Button>
				<Alert variant='destructive'>
					<CircleAlert />
					<AlertDescription>{query.error.message}</AlertDescription>
				</Alert>
				<Button
					type='button'
					variant='outline'
					className='h-11'
					disabled={query.isFetching}
					onClick={() => query.refetch()}
				>
					Tentar de novo
				</Button>
			</main>
		)
	}

	if (query.data === null) return <ChildNotFound />

	if (query.isPending) {
		return (
			<main aria-busy='true' className='flex flex-col gap-6 p-4 md:p-8'>
				<span className='sr-only'>Carregando criança…</span>
				<Skeleton className='h-14 w-64' />
				<Skeleton className='h-48 w-full' />
			</main>
		)
	}

	return (
		<ChildDetails
			child={query.data}
			canDelete={user.role === COORDINATOR_ROLE}
		/>
	)
}
