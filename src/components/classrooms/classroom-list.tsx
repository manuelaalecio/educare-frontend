import type { Classroom } from '#/integrations/educare-api/classrooms'
import {
	ClassroomActions,
	type ClassroomActionsProps,
} from './classroom-actions'
import { studentSummary } from './format'

type Props = Omit<ClassroomActionsProps, 'classroom'> & {
	classrooms: Classroom[]
}

/** Lista de turmas no celular (abaixo de 768 px). */
export function ClassroomList({ classrooms, onEdit, onDelete }: Props) {
	return (
		<ul aria-label='Turmas' className='md:hidden'>
			{classrooms.map((classroom) => (
				<li
					key={classroom.id}
					className='flex items-center gap-3 border-t px-4 py-3'
				>
					<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
						<span className='truncate text-sm font-bold'>{classroom.name}</span>
						<span className='text-xs text-muted-foreground'>
							{studentSummary(classroom)}
						</span>
					</div>
					<ClassroomActions
						classroom={classroom}
						onEdit={onEdit}
						onDelete={onDelete}
					/>
				</li>
			))}
		</ul>
	)
}
