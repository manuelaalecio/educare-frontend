import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { CircleAlert, Plus } from 'lucide-react'
import { type RefObject, useRef, useState } from 'react'
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
import type {
	Classroom,
	ClassroomResult,
} from '#/integrations/educare-api/classrooms'
import {
	createClassroom,
	deleteClassroom,
	renameClassroom,
} from '#/integrations/educare-api/functions'
import { messages } from '#/integrations/educare-api/messages'
import { classroomsQuery } from '#/integrations/educare-api/queries'
import { ClassroomForm } from './classroom-form'
import { ClassroomList } from './classroom-list'
import { ClassroomTable } from './classroom-table'
import { DeleteClassroomConfirm } from './delete-classroom-dialog'
import { classroomCountLabel, nextClassroomPlaceholder } from './format'

type DialogState =
	| { type: 'create' }
	| { type: 'edit' | 'delete'; classroom: Classroom }

const successMessage = {
	create: messages.classroomCreated,
	edit: messages.classroomRenamed,
	delete: messages.classroomDeleted,
} as const

/** Aba Configurações › Turmas: lista, estados e os modais de turma. */
export function ClassroomsSection() {
	const queryClient = useQueryClient()
	const query = useQuery(classroomsQuery)
	const createFn = useServerFn(createClassroom)
	const renameFn = useServerFn(renameClassroom)
	const deleteFn = useServerFn(deleteClassroom)

	// `dialog` continua preenchido depois de fechar, para o conteúdo não sumir
	// durante a animação de saída.
	const [dialog, setDialog] = useState<DialogState>()
	const [open, setOpen] = useState(false)
	// Durante o envio, o modal não fecha (nem por Esc nem por clique fora).
	const [pending, setPending] = useState(false)
	const newButtonRef = useRef<HTMLButtonElement>(null)
	const nameRef = useRef<HTMLInputElement>(null)
	const cancelRef = useRef<HTMLButtonElement>(null)
	// Botão que abriu o modal, para devolver o foco ao fechar. Se a linha da
	// turma vai sumir, o foco vai para "Nova turma".
	const openerRef = useRef<HTMLElement | null>(null)
	const focusNewOnClose = useRef(false)

	const count = query.data?.length ?? 0

	function openDialog(next: DialogState, opener: HTMLElement) {
		openerRef.current = opener
		focusNewOnClose.current = false
		setDialog(next)
		setOpen(true)
	}

	async function run(call: () => Promise<ClassroomResult>) {
		setPending(true)
		try {
			return await call()
		} finally {
			setPending(false)
		}
	}

	function done(type: DialogState['type'], result: ClassroomResult) {
		const notFound = !result.ok && result.kind === 'not-found'
		focusNewOnClose.current = type === 'delete' || notFound
		setOpen(false)
		if (notFound) toast.error(messages.classroomNotFound)
		else toast.success(successMessage[type])
		void queryClient.invalidateQueries({ queryKey: classroomsQuery.queryKey })
	}

	const close = () => setOpen(false)

	return (
		<section
			aria-labelledby='titulo-cfg-turmas'
			aria-busy={query.isPending || undefined}
			className='flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground'
		>
			<div className='flex flex-wrap items-center justify-between gap-3 p-4 md:p-6'>
				<div className='flex flex-col gap-0.5'>
					<h2 id='titulo-cfg-turmas' className='text-base font-bold'>
						Turmas
					</h2>
					{query.isSuccess && (
						<p className='text-sm text-muted-foreground'>
							{classroomCountLabel(count)}
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
					Nova turma
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

			{query.isSuccess && count === 0 && (
				<p className='border-t p-4 text-sm text-muted-foreground md:p-6'>
					Crie a primeira turma para usá-la nos gráficos do Início.
				</p>
			)}

			{query.isSuccess && count > 0 && (
				<>
					<ClassroomTable
						classrooms={query.data}
						onEdit={(classroom, opener) =>
							openDialog({ type: 'edit', classroom }, opener)
						}
						onDelete={(classroom, opener) =>
							openDialog({ type: 'delete', classroom }, opener)
						}
					/>
					<ClassroomList
						classrooms={query.data}
						onEdit={(classroom, opener) =>
							openDialog({ type: 'edit', classroom }, opener)
						}
						onDelete={(classroom, opener) =>
							openDialog({ type: 'delete', classroom }, opener)
						}
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
							else nameRef.current?.focus()
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
							count={count}
							nameRef={nameRef}
							cancelRef={cancelRef}
							onCancel={close}
							onDone={done}
							create={(values) => run(() => createFn({ data: values }))}
							rename={(id, values) =>
								run(() => renameFn({ data: { id, ...values } }))
							}
							remove={(id) => run(() => deleteFn({ data: { id } }))}
						/>
					</DialogContent>
				)}
			</Dialog>
		</section>
	)
}

function DialogBody({
	dialog,
	count,
	nameRef,
	cancelRef,
	onCancel,
	onDone,
	create,
	rename,
	remove,
}: {
	dialog: DialogState
	count: number
	nameRef: RefObject<HTMLInputElement | null>
	cancelRef: RefObject<HTMLButtonElement | null>
	onCancel: () => void
	onDone: (type: DialogState['type'], result: ClassroomResult) => void
	create: (values: { name: string }) => Promise<ClassroomResult>
	rename: (id: string, values: { name: string }) => Promise<ClassroomResult>
	remove: (id: string) => Promise<ClassroomResult>
}) {
	if (dialog.type === 'create') {
		return (
			<>
				<Header
					title='Nova turma'
					description='A turma aparece nos gráficos do Início assim que for criada.'
				/>
				<ClassroomForm
					mode='create'
					placeholder={nextClassroomPlaceholder(count)}
					nameRef={nameRef}
					onSubmit={create}
					onDone={(result) => onDone('create', result)}
					onCancel={onCancel}
				/>
			</>
		)
	}
	const { classroom } = dialog
	if (dialog.type === 'edit') {
		return (
			<>
				<Header
					title='Editar turma'
					description='Mudar o nome não tira nenhum aluno da turma.'
				/>
				<ClassroomForm
					mode='edit'
					initialName={classroom.name}
					studentCount={classroom.studentCount}
					nameRef={nameRef}
					onSubmit={(values) => rename(classroom.id, values)}
					onDone={(result) => onDone('edit', result)}
					onCancel={onCancel}
				/>
			</>
		)
	}
	return (
		<>
			<Header
				title={`Excluir ${classroom.name}?`}
				description='A turma sai da lista e dos gráficos do Início. Só dá para excluir turmas sem alunos.'
			/>
			<DeleteClassroomConfirm
				cancelRef={cancelRef}
				onConfirm={() => remove(classroom.id)}
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
			<span className='sr-only'>Carregando turmas…</span>
			{[0, 1, 2].map((row) => (
				<div
					key={row}
					data-testid='classroom-skeleton'
					className='flex items-center gap-4 border-b px-4 py-5 md:px-6'
				>
					<Skeleton className='h-4 w-40' />
					<Skeleton className='ml-auto h-4 w-24' />
				</div>
			))}
		</div>
	)
}
