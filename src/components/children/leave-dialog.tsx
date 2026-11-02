import { Button } from '#/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '#/components/ui/dialog'

export type LeaveDialogProps = {
	open: boolean
	/** "Continuar editando": fica no formulário. */
	onStay: () => void
	/** "Sair sem salvar": segue a navegação bloqueada. */
	onLeave: () => void
}

/** Confirmação "Sair sem salvar?" do formulário com alterações (design, D9). */
export function LeaveDialog({ open, onStay, onLeave }: LeaveDialogProps) {
	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onStay()
			}}
		>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>Sair sem salvar?</DialogTitle>
					<DialogDescription>
						As alterações feitas neste formulário serão perdidas.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						type='button'
						variant='outline'
						className='h-11'
						onClick={onStay}
					>
						Continuar editando
					</Button>
					<Button
						type='button'
						variant='destructive'
						className='h-11'
						onClick={onLeave}
					>
						Sair sem salvar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
