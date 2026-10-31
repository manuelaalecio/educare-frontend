import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { CircleAlert, Plus } from 'lucide-react'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '#/components/ui/dialog'
import { Skeleton } from '#/components/ui/skeleton'
import {
	createUser,
	deleteUser,
	resetUserPassword,
	updateUser,
} from '#/integrations/educare-api/functions'
import { messages } from '#/integrations/educare-api/messages'
import {
	currentUserQuery,
	usersQuery,
	usersQueryKey,
} from '#/integrations/educare-api/queries'
import type { User, UserResult } from '#/integrations/educare-api/users'
import type {
	CreateUserValues,
	ResetPasswordFormValues,
} from '#/integrations/educare-api/validation'
import { DeleteUserConfirm } from './delete-user-dialog'
import { userCountLabel } from './format'
import { Pagination } from './pagination'
import { ResetPasswordForm } from './reset-password-form'
import { UserForm } from './user-form'
import { UserList } from './user-list'
import { UserTable } from './user-table'

type DialogState =
	| { type: 'create' }
	| { type: 'edit' | 'reset' | 'delete'; user: User }

const successMessage = {
	create: messages.userCreated,
	edit: messages.userUpdated,
	reset: messages.userPasswordReset,
	delete: messages.userDeleted,
} as const

export type UsersSectionProps = {
	/** Página atual, começando em 1. */
	page: number
	/** `replace` não deixa a página pedida no histórico. */
	onPageChange: (page: number, options?: { replace?: boolean }) => void
	currentUserId: string
}

/** Aba Configurações › Usuários: lista paginada, estados e os modais. */
export function UsersSection({
	page,
	onPageChange,
	currentUserId,
}: UsersSectionProps) {
	const queryClient = useQueryClient()
	const router = useRouter()
	const query = useQuery(usersQuery(page))
	const createFn = useServerFn(createUser)
	const updateFn = useServerFn(updateUser)
	const resetFn = useServerFn(resetUserPassword)
	const deleteFn = useServerFn(deleteUser)

	// `dialog` continua preenchido depois de fechar, para o conteúdo não sumir
	// durante a animação de saída.
	const [dialog, setDialog] = useState<DialogState>()
	const [open, setOpen] = useState(false)
	// Durante o envio, o modal não fecha (nem por Esc nem por clique fora).
	const [pending, setPending] = useState(false)
	const newButtonRef = useRef<HTMLButtonElement>(null)
	const firstFieldRef = useRef<HTMLInputElement>(null)
	const cancelRef = useRef<HTMLButtonElement>(null)
	// Botão que abriu o modal, para devolver o foco ao fechar. Se a linha do
	// usuário vai sumir, o foco vai para "Novo usuário".
	const openerRef = useRef<HTMLElement | null>(null)
	const focusNewOnClose = useRef(false)

	const data = query.data
	// Uma página além da última (endereço antigo, ou a última página esvaziou
	// depois de excluir) leva à última página que existe.
	const lastPage = data?.page.totalPages ?? 0
	const pastTheEnd =
		!query.isPlaceholderData &&
		data !== undefined &&
		data.users.length === 0 &&
		lastPage > 0 &&
		page > lastPage
	useEffect(() => {
		if (pastTheEnd) onPageChange(lastPage, { replace: true })
	}, [pastTheEnd, lastPage, onPageChange])

	function openDialog(next: DialogState, opener: HTMLElement) {
		openerRef.current = opener
		focusNewOnClose.current = false
		setDialog(next)
		setOpen(true)
	}

	async function run(call: () => Promise<UserResult>) {
		setPending(true)
		try {
			return await call()
		} finally {
			setPending(false)
		}
	}

	async function done(type: DialogState['type'], result: UserResult) {
		const notFound = !result.ok && result.kind === 'not-found'
		focusNewOnClose.current = type === 'delete' || notFound
		setOpen(false)
		if (notFound) toast.error(messages.userNotFound)
		else toast.success(successMessage[type])
		void queryClient.invalidateQueries({ queryKey: usersQueryKey })
		// Editar a si mesmo muda a sessão: o `beforeLoad` de Configurações roda
		// de novo e tira daqui quem deixou de ser coordenador(a).
		if (
			result.ok &&
			type === 'edit' &&
			dialog?.type === 'edit' &&
			dialog.user.id === currentUserId
		) {
			await queryClient.invalidateQueries({
				queryKey: currentUserQuery.queryKey,
			})
			await router.invalidate()
		}
	}

	const close = () => setOpen(false)
	const collectionProps = {
		currentUserId,
		onEdit: (user: User, opener: HTMLElement) =>
			openDialog({ type: 'edit', user }, opener),
		onResetPassword: (user: User, opener: HTMLElement) =>
			openDialog({ type: 'reset', user }, opener),
		onDelete: (user: User, opener: HTMLElement) =>
			openDialog({ type: 'delete', user }, opener),
	}

	return (
		<section
			aria-labelledby='titulo-cfg-usuarios'
			aria-busy={query.isPending || undefined}
			className='flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground'
		>
			<div className='flex flex-wrap items-center justify-between gap-3 p-4 md:p-6'>
				<div className='flex flex-col gap-0.5'>
					<h2 id='titulo-cfg-usuarios' className='text-base font-bold'>
						Usuários
					</h2>
					{data && (
						<p className='text-sm text-muted-foreground'>
							{userCountLabel(data.page.totalElements)}
						</p>
					)}
				</div>
				<Button
					ref={newButtonRef}
					type='button'
					className='h-11 rounded-[10px] px-4.5 font-bold'
					onClick={(event) =>
						openDialog({ type: 'create' }, event.currentTarget)
					}
				>
					<Plus aria-hidden='true' className='size-[18px]' />
					Novo usuário
				</Button>
			</div>

			{query.isPending && <LoadingRows />}

			{query.isError && (
				<div className='flex flex-col items-start gap-3 border-t p-4 md:p-6'>
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
			)}

			{data && !query.isError && (
				<>
					<UserTable users={data.users} {...collectionProps} />
					<UserList users={data.users} {...collectionProps} />
					<Pagination
						page={data.page}
						shown={data.users.length}
						busy={query.isFetching}
						onPrevious={() => onPageChange(page - 1)}
						onNext={() => onPageChange(page + 1)}
					/>
				</>
			)}

			<Dialog
				open={open}
				onOpenChange={(next) => {
					if (!pending) setOpen(next)
				}}
			>
				{dialog && (
					<DialogContent
						onOpenAutoFocus={(event) => {
							event.preventDefault()
							if (dialog.type === 'delete') cancelRef.current?.focus()
							else firstFieldRef.current?.focus()
						}}
						onCloseAutoFocus={(event) => {
							event.preventDefault()
							const opener = openerRef.current
							const target =
								focusNewOnClose.current || !opener?.isConnected
									? newButtonRef.current
									: opener
							target?.focus()
						}}
						onEscapeKeyDown={(event) => {
							if (pending) event.preventDefault()
						}}
						onInteractOutside={(event) => {
							if (pending) event.preventDefault()
						}}
					>
						<DialogBody
							dialog={dialog}
							firstFieldRef={firstFieldRef}
							cancelRef={cancelRef}
							onCancel={close}
							onDone={done}
							create={(values) => run(() => createFn({ data: values }))}
							update={(user, values) =>
								run(() =>
									updateFn({
										data: {
											id: user.id,
											name: values.name,
											login: values.login,
											role: values.role,
											currentRole: user.role,
											currentLogin: user.login,
										},
									}),
								)
							}
							reset={(user, values) =>
								run(() => resetFn({ data: { id: user.id, ...values } }))
							}
							remove={(user) => run(() => deleteFn({ data: { id: user.id } }))}
						/>
					</DialogContent>
				)}
			</Dialog>
		</section>
	)
}

function DialogBody({
	dialog,
	firstFieldRef,
	cancelRef,
	onCancel,
	onDone,
	create,
	update,
	reset,
	remove,
}: {
	dialog: DialogState
	firstFieldRef: RefObject<HTMLInputElement | null>
	cancelRef: RefObject<HTMLButtonElement | null>
	onCancel: () => void
	onDone: (type: DialogState['type'], result: UserResult) => void
	create: (values: CreateUserValues) => Promise<UserResult>
	update: (user: User, values: CreateUserValues) => Promise<UserResult>
	reset: (user: User, values: ResetPasswordFormValues) => Promise<UserResult>
	remove: (user: User) => Promise<UserResult>
}) {
	if (dialog.type === 'create') {
		return (
			<>
				<Header
					title='Novo usuário'
					description='A pessoa entra no sistema com este email e a senha definida aqui.'
				/>
				<UserForm
					mode='create'
					nameRef={firstFieldRef}
					onSubmit={create}
					onDone={(result) => onDone('create', result)}
					onCancel={onCancel}
				/>
			</>
		)
	}
	const { user } = dialog
	if (dialog.type === 'edit') {
		return (
			<>
				<Header
					title='Editar usuário'
					description='Altere o nome, o email de acesso ou a função.'
				/>
				<UserForm
					mode='edit'
					initialValues={{
						name: user.name,
						login: user.login,
						// Uma role fora da lista (de antes da troca) começa como Educador(a).
						role: user.role === 'COORDENADOR' ? 'COORDENADOR' : 'EDUCADOR',
					}}
					nameRef={firstFieldRef}
					onSubmit={(values) => update(user, values)}
					onDone={(result) => onDone('edit', result)}
					onCancel={onCancel}
				/>
			</>
		)
	}
	if (dialog.type === 'reset') {
		return (
			<>
				<Header
					title='Redefinir senha'
					description='A senha atual deixa de funcionar. Avise a pessoa da nova senha.'
				/>
				<ResetPasswordForm
					user={user}
					newPasswordRef={firstFieldRef}
					onSubmit={(values) => reset(user, values)}
					onDone={(result) => onDone('reset', result)}
					onCancel={onCancel}
				/>
			</>
		)
	}
	return (
		<>
			<Header
				title={`Excluir ${user.name}?`}
				description={`${user.name} (${user.login}) perde o acesso ao sistema.`}
			/>
			<DeleteUserConfirm
				cancelRef={cancelRef}
				onConfirm={() => remove(user)}
				onDone={(result) => onDone('delete', result)}
				onCancel={onCancel}
			/>
		</>
	)
}

function Header({
	title,
	description,
}: {
	title: string
	description: string
}) {
	return (
		<DialogHeader>
			<DialogTitle className='text-xl font-extrabold'>{title}</DialogTitle>
			<DialogDescription>{description}</DialogDescription>
		</DialogHeader>
	)
}

function LoadingRows() {
	return (
		<div className='flex flex-col border-t'>
			<span className='sr-only'>Carregando usuários…</span>
			{[0, 1, 2].map((row) => (
				<div
					key={row}
					data-testid='user-skeleton'
					className='flex items-center gap-4 border-b px-4 py-5 md:px-6'
				>
					<Skeleton className='size-9 rounded-full' />
					<Skeleton className='h-4 w-40' />
					<Skeleton className='ml-auto h-4 w-24' />
				</div>
			))}
		</div>
	)
}
