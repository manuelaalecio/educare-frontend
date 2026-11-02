import { useQuery } from '@tanstack/react-query'
import { CircleAlert } from 'lucide-react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { childClassroomsQuery } from '#/integrations/educare-api/queries'
import { periodLabel } from './format'

/**
 * Conteúdo do cartão "Histórico de turmas", do período mais recente para o
 * mais antigo. Um erro fica só neste cartão, com "Tentar de novo".
 */
export function ClassroomHistory({ childId }: { childId: string }) {
	const query = useQuery(childClassroomsQuery(childId))

	if (query.isPending) {
		return (
			<div aria-busy='true' className='flex flex-col gap-3'>
				<span className='sr-only'>Carregando histórico de turmas…</span>
				<Skeleton className='h-4 w-48' />
				<Skeleton className='h-4 w-56' />
			</div>
		)
	}

	if (query.isError) {
		return (
			<div className='flex flex-col items-start gap-3'>
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
			</div>
		)
	}

	return (
		<ol aria-label='Turmas da criança' className='flex flex-col gap-3'>
			{query.data.map((period) => (
				<li
					key={`${period.classroomId}-${period.startDate}`}
					className={
						period.endDate
							? 'text-sm text-muted-foreground'
							: 'text-sm font-semibold'
					}
				>
					{periodLabel(period)}
				</li>
			))}
		</ol>
	)
}
