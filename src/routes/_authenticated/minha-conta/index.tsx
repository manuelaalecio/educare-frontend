import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { KeyRound, LockKeyhole } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
	ChangePasswordForm,
	type ChangePasswordResult,
} from '#/components/auth/change-password-form'
import { initials, memberSince, roleLabel } from '#/components/layout/user'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#/components/ui/dialog'
import type { CurrentUser } from '#/integrations/educare-api/auth'
import { changeOwnPassword } from '#/integrations/educare-api/functions'
import { messages } from '#/integrations/educare-api/messages'
import type { ChangePasswordValues } from '#/integrations/educare-api/validation'

export const Route = createFileRoute('/_authenticated/minha-conta/')({
	head: () => ({ meta: [{ title: 'Minha conta · Educare' }] }),
	component: MyAccountPage,
})

function MyAccountPage() {
	const { user } = Route.useRouteContext()
	return (
		<main className='flex max-w-3xl flex-col gap-6 p-4 md:p-8'>
			<div>
				<h1 className='text-2xl font-extrabold tracking-tight text-foreground md:text-3xl'>
					Minha conta
				</h1>
				<p className='mt-2 text-muted-foreground'>
					Seus dados de acesso ao Educare.
				</p>
			</div>
			<ProfileCard user={user} />
			<PasswordCard />
		</main>
	)
}

function ProfileCard({ user }: { user: CurrentUser }) {
	const role = roleLabel(user.role)
	const details = [
		['Email de acesso', user.login],
		['Função', role],
		['Membro desde', memberSince(user.createdAt)],
	]
	return (
		<Card aria-labelledby='titulo-perfil' className='gap-5 px-6' role='region'>
			<div className='flex items-center gap-4'>
				<Avatar className='size-14' aria-hidden='true'>
					<AvatarFallback className='bg-sage-200 text-lg font-extrabold text-sage-700 dark:bg-sage-800 dark:text-sage-300'>
						{initials(user.name)}
					</AvatarFallback>
				</Avatar>
				<div className='flex min-w-0 flex-col items-start gap-1'>
					<h2 id='titulo-perfil' className='truncate text-lg font-bold'>
						{user.name}
					</h2>
					<span className='rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground'>
						{role}
					</span>
				</div>
			</div>
			<dl className='grid gap-4 border-t pt-5 md:grid-cols-3'>
				{details.map(([term, value]) => (
					<div key={term} className='flex min-w-0 flex-col gap-1'>
						<dt className='text-xs font-bold tracking-wide text-muted-foreground uppercase'>
							{term}
						</dt>
						<dd className='truncate text-sm font-semibold'>{value}</dd>
					</div>
				))}
			</dl>
			<p className='text-sm text-muted-foreground'>
				Nome, email e função são alterados por um(a) coordenador(a), em
				Configurações.
			</p>
		</Card>
	)
}

function PasswordCard() {
	const changeFn = useServerFn(changeOwnPassword)
	const [open, setOpen] = useState(false)
	// Durante o envio, o modal não fecha (nem por Esc nem por clique fora).
	const [pending, setPending] = useState(false)
	const currentPasswordRef = useRef<HTMLInputElement>(null)

	async function submit(
		values: ChangePasswordValues,
	): Promise<ChangePasswordResult> {
		setPending(true)
		try {
			const result = await changeFn({ data: values })
			return result.ok
				? result
				: {
						ok: false,
						message: result.message,
						fieldErrors: result.fieldErrors,
					}
		} finally {
			setPending(false)
		}
	}

	return (
		<Card
			aria-labelledby='titulo-senha'
			className='gap-5 px-6 md:flex-row md:items-center md:justify-between'
			role='region'
		>
			<div className='flex items-start gap-4'>
				<div
					aria-hidden='true'
					className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground'
				>
					<LockKeyhole className='size-5' />
				</div>
				<div className='flex flex-col gap-1'>
					<h2 id='titulo-senha' className='text-lg font-bold'>
						Senha
					</h2>
					<p className='text-sm text-muted-foreground'>
						Troque sua senha se desconfiar de acesso indevido. Os outros
						dispositivos conectados à sua conta são desconectados.
					</p>
				</div>
			</div>
			<Dialog
				open={open}
				onOpenChange={(next) => {
					if (!pending) setOpen(next)
				}}
			>
				<DialogTrigger asChild>
					<Button variant='outline' className='h-11 shrink-0'>
						<KeyRound aria-hidden='true' className='size-[18px]' />
						Alterar senha
					</Button>
				</DialogTrigger>
				<DialogContent
					onOpenAutoFocus={(event) => {
						event.preventDefault()
						currentPasswordRef.current?.focus()
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
							Alterar senha
						</DialogTitle>
						<DialogDescription>
							Confirme sua senha atual e escolha uma nova.
						</DialogDescription>
					</DialogHeader>
					<ChangePasswordForm
						currentPasswordRef={currentPasswordRef}
						onSubmit={submit}
						onCancel={() => setOpen(false)}
						onSuccess={() => {
							setOpen(false)
							toast.success(messages.passwordChanged)
						}}
					/>
				</DialogContent>
			</Dialog>
		</Card>
	)
}
