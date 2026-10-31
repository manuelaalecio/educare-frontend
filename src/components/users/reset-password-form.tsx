import { useForm } from '@tanstack/react-form'
import { CircleAlert } from 'lucide-react'
import { type Ref, useId, useState } from 'react'
import { PasswordInput } from '#/components/auth/password-input'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import type { User, UserResult } from '#/integrations/educare-api/users'
import {
	type ResetPasswordFormValues,
	resetPasswordFormSchema,
} from '#/integrations/educare-api/validation'
import { describedBy, firstError } from './field'
import { UserAvatar } from './role-badge'

type FieldName = keyof ResetPasswordFormValues

const fields: { name: FieldName; label: string; placeholder: string }[] = [
	{ name: 'newPassword', label: 'Nova senha', placeholder: 'Nova senha' },
	{
		name: 'confirmPassword',
		label: 'Confirmar nova senha',
		placeholder: 'Repita a nova senha',
	},
]

export type ResetPasswordFormProps = {
	user: User
	onSubmit: (values: ResetPasswordFormValues) => Promise<UserResult>
	/** Recebe o resultado que não foi um erro do formulário (sucesso ou 404). */
	onDone: (result: UserResult) => void
	onCancel: () => void
	/** Recebe o campo "Nova senha", que o modal foca ao abrir. */
	newPasswordRef?: Ref<HTMLInputElement>
}

/**
 * Conteúdo do modal "Redefinir senha". As senhas ficam só no estado do
 * formulário, descartado quando o modal fecha.
 */
export function ResetPasswordForm({
	user,
	onSubmit,
	onDone,
	onCancel,
	newPasswordRef,
}: ResetPasswordFormProps) {
	const [message, setMessage] = useState<string>()
	const [serverErrors, setServerErrors] = useState<
		Partial<Record<FieldName, string>>
	>({})
	const id = useId()

	const form = useForm({
		defaultValues: { newPassword: '', confirmPassword: '' },
		validators: { onSubmit: resetPasswordFormSchema },
		onSubmit: async ({ value }) => {
			setMessage(undefined)
			setServerErrors({})
			const result = await onSubmit(value)
			if (result.ok || result.kind === 'not-found') {
				onDone(result)
				return
			}
			setMessage(result.message)
			setServerErrors(result.fieldErrors)
		},
	})

	return (
		<form
			noValidate
			className='flex flex-col gap-4'
			onSubmit={(event) => {
				event.preventDefault()
				form.handleSubmit()
			}}
		>
			<div className='flex items-center gap-3 rounded-lg bg-muted px-3 py-2.5'>
				<UserAvatar name={user.name} />
				<div className='flex min-w-0 flex-col gap-0.5'>
					<span className='truncate text-sm font-bold'>{user.name}</span>
					<span className='truncate text-xs text-muted-foreground'>
						{user.login}
					</span>
				</div>
			</div>

			{message && (
				<Alert variant='destructive'>
					<CircleAlert />
					<AlertDescription>{message}</AlertDescription>
				</Alert>
			)}

			{fields.map(({ name, label, placeholder }) => (
				<form.Field key={name} name={name}>
					{(field) => {
						const error =
							firstError(field.state.meta.errors) ?? serverErrors[name]
						const inputId = `${id}-${name}`
						const errorId = error ? `${inputId}-error` : undefined
						return (
							<div className='flex flex-col gap-2'>
								<Label htmlFor={inputId}>{label}</Label>
								<PasswordInput
									ref={name === 'newPassword' ? newPasswordRef : undefined}
									id={inputId}
									name={name}
									label={label}
									placeholder={placeholder}
									autoComplete='new-password'
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => {
										field.handleChange(event.target.value)
										setServerErrors((errors) => ({
											...errors,
											[name]: undefined,
										}))
									}}
									aria-invalid={error ? true : undefined}
									aria-describedby={describedBy(errorId)}
								/>
								{errorId && (
									<p id={errorId} className='text-sm text-destructive'>
										{error}
									</p>
								)}
							</div>
						)
					}}
				</form.Field>
			))}

			<form.Subscribe selector={(state) => state.isSubmitting}>
				{(isSubmitting) => (
					<div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
						<Button
							type='button'
							variant='outline'
							className='h-11'
							disabled={isSubmitting}
							onClick={onCancel}
						>
							Cancelar
						</Button>
						<Button type='submit' className='h-11' disabled={isSubmitting}>
							Salvar nova senha
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	)
}
