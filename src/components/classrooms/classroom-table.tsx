import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#/components/ui/table'
import type { Classroom } from '#/integrations/educare-api/classrooms'
import {
	ClassroomActions,
	type ClassroomActionsProps,
} from './classroom-actions'
import { formatCreatedAt } from './format'

type Props = Omit<ClassroomActionsProps, 'classroom'> & {
	classrooms: Classroom[]
}

const head =
	'h-auto py-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase'

/** Tabela de turmas, a partir de 768 px. */
export function ClassroomTable({ classrooms, onEdit, onDelete }: Props) {
	return (
		<div className='hidden md:block'>
			<Table aria-label='Turmas' className='table-fixed'>
				<TableHeader className='bg-muted/50'>
					<TableRow className='hover:bg-transparent'>
						<TableHead className={`${head} pl-6`}>Nome</TableHead>
						<TableHead className={`${head} w-24 text-right`}>Alunos</TableHead>
						<TableHead className={`${head} w-24 text-right`}>Meninos</TableHead>
						<TableHead className={`${head} w-24 text-right`}>Meninas</TableHead>
						<TableHead className={`${head} w-32 pl-6`}>Criada em</TableHead>
						<TableHead className={`${head} w-32 pr-6 text-right`}>
							Ações
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{classrooms.map((classroom) => (
						<TableRow key={classroom.id}>
							<TableCell className='truncate py-1.5 pl-6 text-sm font-bold'>
								{classroom.name}
							</TableCell>
							<TableCell className='text-right text-sm font-bold tabular-nums'>
								{classroom.studentCount}
							</TableCell>
							<TableCell className='text-right text-sm text-muted-foreground tabular-nums'>
								{classroom.maleCount}
							</TableCell>
							<TableCell className='text-right text-sm text-muted-foreground tabular-nums'>
								{classroom.femaleCount}
							</TableCell>
							<TableCell className='pl-6 text-sm text-muted-foreground tabular-nums'>
								{formatCreatedAt(classroom.createdAt)}
							</TableCell>
							<TableCell className='py-1.5 pr-6'>
								<ClassroomActions
									classroom={classroom}
									onEdit={onEdit}
									onDelete={onDelete}
								/>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	)
}
