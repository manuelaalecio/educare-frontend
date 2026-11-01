import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import type { Classroom } from '#/integrations/educare-api/classrooms'

export type ClassroomActionsProps = {
	classroom: Classroom
	/** `opener` recebe o foco de volta quando o modal fecha. */
	onEdit: (classroom: Classroom, opener: HTMLElement) => void
	onDelete: (classroom: Classroom, opener: HTMLElement) => void
}

/** Botões de editar e excluir de uma turma, na tabela e na lista. */
export function ClassroomActions({
	classroom,
	onEdit,
	onDelete,
}: ClassroomActionsProps) {
	return (
		<div className='flex shrink-0 justify-end gap-0.5'>
			<Button
				type='button'
				variant='ghost'
				size='icon'
				className='size-11 rounded-[10px]'
				aria-label={`Editar ${classroom.name}`}
				title='Editar'
				onClick={(event) => onEdit(classroom, event.currentTarget)}
			>
				<Pencil aria-hidden='true' className='size-[18px]' />
			</Button>
			<Button
				type='button'
				variant='ghost'
				size='icon'
				className='size-11 rounded-[10px] text-destructive hover:text-destructive'
				aria-label={`Excluir ${classroom.name}`}
				title='Excluir'
				onClick={(event) => onDelete(classroom, event.currentTarget)}
			>
				<Trash2 aria-hidden='true' className='size-[18px]' />
			</Button>
		</div>
	)
}
