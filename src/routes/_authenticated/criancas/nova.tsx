import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChildForm } from '#/components/children/child-form'
import { useCreateChild } from '#/components/children/mutations'
import { QueryErrorAlert } from '#/components/children/query-error'
import { classroomsQuery, loadQuery } from '#/integrations/educare-api/queries'
import {
	COORDINATOR_ROLE,
	EMPTY_CHILD_FORM_VALUES,
} from '#/integrations/educare-api/validation'

export const Route = createFileRoute('/_authenticated/criancas/nova')({
	head: () => ({ meta: [{ title: 'Nova criança · Educare' }] }),
	loader: ({ context }) => loadQuery(context.queryClient, classroomsQuery),
	component: NewChildPage,
})

function NewChildPage() {
	const { user } = Route.useRouteContext()
	const classrooms = useQuery(classroomsQuery)
	const create = useCreateChild()

	return (
		<main className='flex max-w-4xl flex-col gap-6 p-4 md:p-8'>
			<div>
				<h1 className='text-2xl font-extrabold tracking-tight text-foreground md:text-3xl'>
					Nova criança
				</h1>
				<p className='mt-2 text-muted-foreground'>
					Preencha os dados da criança. Os campos com * são obrigatórios.
				</p>
			</div>
			{classrooms.data ? (
				<ChildForm
					mode='create'
					defaultValues={EMPTY_CHILD_FORM_VALUES}
					classrooms={classrooms.data}
					canManageClassrooms={user.role === COORDINATOR_ROLE}
					onSave={create.mutateAsync}
					cancel={<Link to='/criancas'>Cancelar</Link>}
				/>
			) : classrooms.isError ? (
				<QueryErrorAlert
					message={classrooms.error.message}
					retrying={classrooms.isFetching}
					onRetry={() => classrooms.refetch()}
				/>
			) : null}
		</main>
	)
}
