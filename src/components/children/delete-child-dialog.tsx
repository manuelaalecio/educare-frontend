import { isRedirect, useNavigate } from '@tanstack/react-router'
import { CircleAlert, Trash2, TriangleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#/components/ui/dialog'
import { ApiFieldError } from '#/integrations/educare-api/errors'
import { messages } from '#/integrations/educare-api/messages'
import { useDeleteChild } from './mutations'

/**
 * Botão "Excluir" e o modal de confirmação. O estado fica aqui dentro, para
 * que abrir, enviar e errar não renderizem de novo a página de detalhes.
 * No sucesso (e no `404`), vai para `/criancas` com o aviso certo; outros
 * erros aparecem no alerta do modal, que continua aberto.
 */
export function DeleteChildDialog({
	child,
}: {
	child: { id: string; name: string }
}) {
	const navigate = useNavigate()
	const mutation = useDeleteChild(child.id)
	const [open, setOpen] = useState(false)
	// Fica `true` até a navegação terminar: o modal não fecha nem reabilita.
	const [pending, setPending] = useState(false)
	const [message, setMessage] = useState<string>()
	const cancelRef = useRef<HTMLButtonElement>(null)

	async function confirm() {
		setPending(true)
		setMessage(undefined)
		try {
			const result = await mutation.mutateAsync()
			if (result.notFound) toast.error(messages.childNotFound)
			else toast.success(messages.childDeleted)
			await navigate({ to: '/criancas' })
		} catch (error) {
			// O `401` já levou ao login pelo fluxo de sessão expirada.
			if (isRedirect(error)) return
			setMessage(
				error instanceof ApiFieldError && error.message
					? error.message
					: messages.unavailable,
			)
			setPending(false)
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (pending) return
				setOpen(next)
				if (next) setMessage(undefined)
			}}
		>
			<DialogTrigger asChild>
				<Button
					type='button'
					variant='outline'
					className='h-11 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive'
				>
					<Trash2 aria-hidden='true' />
					Excluir
				</Button>
			</DialogTrigger>
			<DialogContent
				onOpenAutoFocus={(event) => {
					event.preventDefault()
					cancelRef.current?.focus()
				}}
				onEscapeKeyDown={(event) => {
					if (pending) event.preventDefault()
				}}
				onInteractOutside={(event) => {
					if (pending) event.preventDefault()
				}}
			>
				<DialogHeader>
					<DialogTitle className='text-xl font-extrabold'>
						{`Excluir ${child.name}?`}
					</DialogTitle>
					<DialogDescription>
						Os dados e o histórico de turmas da criança serão apagados.
					</DialogDescription>
				</DialogHeader>
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
							onClick={() => setOpen(false)}
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
							Excluir criança
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
