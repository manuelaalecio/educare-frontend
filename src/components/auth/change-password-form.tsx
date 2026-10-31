import { useForm } from '@tanstack/react-form'
import { CircleAlert, Smartphone } from 'lucide-react'
import { type Ref, useId, useState } from 'react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import {
	type ChangePasswordValues,
	changePasswordSchema,
} from '#/integrations/educare-api/validation'
import { PasswordInput } from './password-input'

type FieldName = keyof ChangePasswordValues
type FieldErrors = Partial<Record<FieldName, string>>

export type ChangePasswordResult =
	| { ok: true }
	| { ok: false; message?: string; fieldErrors?: FieldErrors }

export type ChangePasswordFormProps = {
	onSubmit: (values: ChangePasswordValues) => Promise<ChangePasswordResult>
	onSuccess: () => void
	onCancel: () => void
	/** Recebe o campo "Senha atual", que o modal foca ao abrir. */
	currentPasswordRef?: Ref<HTMLInputElement>
}

const labels: Record<FieldName, string> = {
	currentPassword: 'Senha atual',
	newPassword: 'Nova senha',
	confirmPassword: 'Confirmar nova senha',
}

const placeholders: Record<FieldName, string> = {
	currentPassword: 'Sua senha atual',
	newPassword: 'Nova senha',
	confirmPassword: 'Repita a nova senha',
}

const autoComplete: Record<FieldName, string> = {
	currentPassword: 'current-password',
	newPassword: 'new-password',
	confirmPassword: 'new-password',
}

const hints: Partial<Record<FieldName, string>> = {
	newPassword: 'De 8 a 72 caracteres, diferente da senha atual e do seu email.',
}

type FieldError = string | { message?: string } | undefined

function firstError(errors: FieldError[]) {
	const [error] = errors
	return typeof error === 'string' ? error : error?.message
}

const emptyValues: ChangePasswordValues = {
	currentPassword: '',
	newPassword: '',
	confirmPassword: '',
}

/**
 * Conteúdo do modal "Alterar senha". O modal desmonta o formulário ao fechar,
 * o que descarta os valores e os erros.
 */
export function ChangePasswordForm({
	onSubmit,
	onSuccess,
	onCancel,
	currentPasswordRef,
}: ChangePasswordFormProps) {
	const [message, setMessage] = useState<string>()
	const [serverErrors, setServerErrors] = useState<FieldErrors>({})
	const id = useId()

	const form = useForm({
		defaultValues: emptyValues,
		validators: { onSubmit: changePasswordSchema },
		onSubmit: async ({ value }) => {
			setMessage(undefined)
			setServerErrors({})
			const result = await onSubmit(value)
			if (result.ok) {
				onSuccess()
				return
			}
			setMessage(result.message)
			setServerErrors(result.fieldErrors ?? {})
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
			{message && (
				<Alert variant='destructive'>
					<CircleAlert />
					<AlertDescription>{message}</AlertDescription>
				</Alert>
			)}

			{(Object.keys(labels) as FieldName[]).map((name) => (
				<form.Field key={name} name={name}>
					{(field) => {
						const error =
							firstError(field.state.meta.errors) ?? serverErrors[name]
						const inputId = `${id}-${name}`
						const hintId = hints[name] ? `${inputId}-hint` : undefined
						const errorId = error ? `${inputId}-error` : undefined
						const describedBy = [hintId, errorId].filter(Boolean).join(' ')
						return (
							<div className='flex flex-col gap-2'>
								<Label htmlFor={inputId}>{labels[name]}</Label>
								<PasswordInput
									ref={
										name === 'currentPassword' ? currentPasswordRef : undefined
									}
									id={inputId}
									name={name}
									label={labels[name]}
									placeholder={placeholders[name]}
									autoComplete={autoComplete[name]}
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
									aria-describedby={describedBy || undefined}
								/>
								{hintId && (
									<p id={hintId} className='text-xs text-muted-foreground'>
										{hints[name]}
									</p>
								)}
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

			<p className='flex items-start gap-2.5 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground'>
				<Smartphone
					aria-hidden='true'
					className='mt-0.5 size-[18px] shrink-0'
				/>
				Você continua conectado aqui. Os outros dispositivos precisarão entrar
				de novo com a nova senha.
			</p>

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
							Alterar senha
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	)
}
