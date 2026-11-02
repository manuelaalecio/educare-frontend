import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { Eye } from 'lucide-react'
import { buttonVariants } from '#/components/ui/button'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#/components/ui/table'
import type { ChildSummary } from '#/integrations/educare-api/children'
import { ageLabel, formatDate } from './format'

export type ChildCollectionProps = {
	items: ChildSummary[]
	/** Hoje em São Paulo, 'AAAA-MM-DD', para a idade. */
	today: string
}

const head =
	'h-auto py-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase'

/** Tabela de crianças, a partir de 768 px. Sem editar nem excluir. */
export function ChildTable({ items, today }: ChildCollectionProps) {
	return (
		<div className='hidden md:block'>
			<Table aria-label='Crianças' className='table-fixed'>
				<TableHeader className='bg-muted/50'>
					<TableRow className='hover:bg-transparent'>
						<TableHead className={`${head} pl-6`}>Nome</TableHead>
						<TableHead className={`${head} w-28`}>Idade</TableHead>
						<TableHead className={`${head} w-32`}>Nascimento</TableHead>
						<TableHead className={head}>Turma</TableHead>
						<TableHead className={`${head} w-24 pr-6 text-right`}>
							Ações
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{items.map((child) => (
						<TableRow key={child.id}>
							<TableCell className='py-1.5 pl-6'>
								<Link
									to='/criancas/$childId'
									params={{ childId: child.id }}
									className='block truncate text-sm font-bold underline-offset-4 hover:underline'
								>
									{child.name}
								</Link>
							</TableCell>
							<TableCell className='text-sm text-muted-foreground'>
								{ageLabel(child.birthDate, today)}
							</TableCell>
							<TableCell className='text-sm text-muted-foreground tabular-nums'>
								{formatDate(child.birthDate)}
							</TableCell>
							<TableCell className='truncate text-sm text-muted-foreground'>
								{child.classroom.name}
							</TableCell>
							<TableCell className='py-1.5 pr-6 text-right'>
								<Link
									to='/criancas/$childId'
									params={{ childId: child.id }}
									aria-label={`Ver ${child.name}`}
									className={cn(
										buttonVariants({ variant: 'ghost', size: 'icon' }),
										'size-11',
									)}
								>
									<Eye aria-hidden='true' className='size-[18px]' />
								</Link>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	)
}
