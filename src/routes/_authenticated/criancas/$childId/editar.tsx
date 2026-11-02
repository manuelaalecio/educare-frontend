import { useQuery } from '@tanstack/react-query'
import {
	type AnyRouteMatch,
	createFileRoute,
	Link,
	notFound,
} from '@tanstack/react-router'
import { useState } from 'react'
import { ChildForm } from '#/components/children/child-form'
import { toChildFormValues } from '#/components/children/form-values'
import { useUpdateChild } from '#/components/children/mutations'
import { QueryErrorAlert } from '#/components/children/query-error'
import { Button } from '#/components/ui/button'
import type { Child } from '#/integrations/educare-api/children'
import type { Classroom } from '#/integrations/educare-api/classrooms'
import {
	childQuery,
	classroomsQuery,
	loadQuery,
} from '#/integrations/educare-api/queries'
import { COORDINATOR_ROLE } from '#/integrations/educare-api/validation'

const TITLE = 'Editar criança · Educare'
const CHILD_NOT_FOUND_TITLE = 'Criança não encontrada · Educare'

const isNotFoundMatch = (match: AnyRouteMatch | undefined) =>
	match?.status === 'notFound' || Boolean(match?._notFound)

// O título da aba nunca leva o nome da criança: fica no histórico do
// navegador (LGPD).
export const Route = createFileRoute(
	'/_authenticated/criancas/$childId/editar',
)({
	head: ({ match }) => ({
		meta: [{ title: isNotFoundMatch(match) ? CHILD_NOT_FOUND_TITLE : TITLE }],
	}),
	loader: async ({ context: { queryClient }, params: { childId } }) => {
		await Promise.all([
			loadQuery(queryClient, childQuery(childId)),
			loadQuery(queryClient, classroomsQuery),
		])
		// `null`: a API respondeu 404, ou o id nem é um UUID.
		if (queryClient.getQueryData(childQuery(childId).queryKey) === null) {
			throw notFound()
		}
	},
	notFoundComponent: ChildNotFound,
	component: EditChildPage,
})

function EditChildPage() {
	const { childId } = Route.useParams()
	const child = useQuery(childQuery(childId))
	const classrooms = useQuery(classroomsQuery)

	const failed = child.isError ? child : classrooms.isError ? classrooms : null

	return (
		<main className='flex max-w-4xl flex-col gap-6 p-4 md:p-8'>
			<div>
				<h1 className='text-2xl font-extrabold tracking-tight text-foreground md:text-3xl'>
					Editar criança
				</h1>
				{child.data && (
					<p className='mt-2 text-muted-foreground'>{child.data.name}</p>
				)}
			</div>
			{child.data && classrooms.data ? (
				<EditForm child={child.data} classrooms={classrooms.data} />
			) : child.data === null ? (
				<ChildNotFound />
			) : failed ? (
				<QueryErrorAlert
					message={failed.error?.message ?? ''}
					retrying={failed.isFetching}
					onRetry={() => failed.refetch()}
				/>
			) : null}
		</main>
	)
}

function EditForm({
	child,
	classrooms,
}: {
	child: Child
	classrooms: Classroom[]
}) {
	const { user } = Route.useRouteContext()
	const update = useUpdateChild(child.id)
	// Os valores iniciais ficam fixos: uma atualização em segundo plano não
	// apaga o que já foi digitado.
	const [defaultValues] = useState(() => toChildFormValues(child))
	return (
		<ChildForm
			mode='edit'
			defaultValues={defaultValues}
			classrooms={classrooms}
			currentClassroom={child.classroom}
			canManageClassrooms={user.role === COORDINATOR_ROLE}
			onSave={update.mutateAsync}
			cancel={
				<Link to='/criancas/$childId' params={{ childId: child.id }}>
					Cancelar
				</Link>
			}
		/>
	)
}

/** Mesmo texto da página de detalhes (spec "Criança não encontrada"). */
function ChildNotFound() {
	return (
		<main className='p-4 md:p-8'>
			<h1 className='text-2xl font-extrabold tracking-tight text-foreground md:text-3xl'>
				Criança não encontrada
			</h1>
			<p className='mt-2 text-muted-foreground'>
				Ela pode ter sido excluída ou o endereço está errado.
			</p>
			<Button asChild className='mt-6 h-11'>
				<Link to='/criancas'>Voltar para Crianças</Link>
			</Button>
		</main>
	)
}
