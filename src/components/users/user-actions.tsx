import { KeyRound, Pencil, Trash2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import type { User } from '#/integrations/educare-api/users'

export type UserActionsProps = {
	user: User
	/** O usuário da sessão: só pode editar a si mesmo nesta aba. */
	isSelf: boolean
	/** `opener` recebe o foco de volta quando o modal fecha. */
	onEdit: (user: User, opener: HTMLElement) => void
	onResetPassword: (user: User, opener: HTMLElement) => void
	onDelete: (user: User, opener: HTMLElement) => void
}

const action = 'size-11 rounded-[10px]'

/** Botões de editar, redefinir a senha e excluir, na tabela e nos cards. */
export function UserActions({
	user,
	isSelf,
	onEdit,
	onResetPassword,
	onDelete,
}: UserActionsProps) {
	return (
		<div className='flex shrink-0 justify-end gap-0.5'>
			<Button
				type='button'
				variant='ghost'
				size='icon'
				className={action}
				aria-label={`Editar ${user.name}`}
				title='Editar'
				onClick={(event) => onEdit(user, event.currentTarget)}
			>
				<Pencil aria-hidden='true' className='size-[18px]' />
			</Button>
			{isSelf ? (
				// Redefinir a própria senha desconectaria esta sessão: ela se troca
				// em Minha conta. O espaço mantém as colunas alinhadas.
				<div aria-hidden='true' className='w-[90px] shrink-0' />
			) : (
				<>
					<Button
						type='button'
						variant='ghost'
						size='icon'
						className={action}
						aria-label={`Redefinir a senha de ${user.name}`}
						title='Redefinir senha'
						onClick={(event) => onResetPassword(user, event.currentTarget)}
					>
						<KeyRound aria-hidden='true' className='size-[18px]' />
					</Button>
					<Button
						type='button'
						variant='ghost'
						size='icon'
						className={`${action} text-destructive hover:text-destructive`}
						aria-label={`Excluir ${user.name}`}
						title='Excluir'
						onClick={(event) => onDelete(user, event.currentTarget)}
					>
						<Trash2 aria-hidden='true' className='size-[18px]' />
					</Button>
				</>
			)}
		</div>
	)
}
