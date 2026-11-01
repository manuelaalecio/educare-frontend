import { CircleAlert, TriangleAlert } from 'lucide-react'
import { type Ref, useState } from 'react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import type { ClassroomResult } from '#/integrations/educare-api/classrooms'

export type DeleteClassroomConfirmProps = {
	onConfirm: () => Promise<ClassroomResult>
	/** Recebe o resultado que não foi um erro mostrado aqui (sucesso ou 404). */
	onDone: (result: ClassroomResult) => void
	onCancel: () => void
	/** Recebe o botão "Cancelar", que o modal foca ao abrir. */
	cancelRef?: Ref<HTMLButtonElement>
}

/** Conteúdo do modal "Excluir <turma>?", abaixo do título e da descrição. */
export function DeleteClassroomConfirm({
	onConfirm,
	onDone,
	onCancel,
	cancelRef,
}: DeleteClassroomConfirmProps) {
	const [pending, setPending] = useState(false)
	const [message, setMessage] = useState<string>()

	async function confirm() {
		setPending(true)
		setMessage(undefined)
		try {
			const result = await onConfirm()
			if (result.ok || result.kind === 'not-found') {
				onDone(result)
				return
			}
			setMessage(result.message)
		} finally {
			setPending(false)
		}
	}

	return (
		<div className='flex flex-col gap-4'>
			<Alert variant='destructive'>
				<TriangleAlert />
				<AlertDescription className='font-semibold'>
					Essa ação não pode ser desfeita.
				</AlertDescription>
			</Alert>
			{message && (
				<Alert variant='destructive'>
					<CircleAlert />
					<AlertDescription>{message}</AlertDescription>
				</Alert>
			)}
			<div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
				<Button
					ref={cancelRef}
					type='button'
					variant='outline'
					className='h-11'
					disabled={pending}
					onClick={onCancel}
				>
					Cancelar
				</Button>
				<Button
					type='button'
					variant='destructive'
					className='h-11'
					disabled={pending}
					onClick={confirm}
				>
					Excluir turma
				</Button>
			</div>
		</div>
	)
}
