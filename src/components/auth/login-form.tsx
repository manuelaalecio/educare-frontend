import { useForm } from '@tanstack/react-form'
import { CircleAlert, Info } from 'lucide-react'
import { useId, useState } from 'react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
	type LoginValues,
	loginSchema,
} from '#/integrations/educare-api/validation'

type FieldErrors = Partial<Record<keyof LoginValues, string>>

export type LoginResult =
	| {
			message?: string
			/** Erros devolvidos pela API, por campo (`login`, `password`). */
			fieldErrors?: FieldErrors
			/** Limpa só a senha (credenciais inválidas). */
			clearPassword?: boolean
	  }
	| undefined

export type LoginFormProps = {
	onSubmit: (values: LoginValues) => Promise<LoginResult>
	/** Aviso acima dos campos, como o de sessão expirada. */
	notice?: string
}

type FieldError = string | { message?: string } | undefined

function firstError(errors: FieldError[]) {
	const [error] = errors
	return typeof error === 'string' ? error : error?.message
}

export function LoginForm({ onSubmit, notice }: LoginFormProps) {
	const [message, setMessage] = useState<string>()
	const [serverErrors, setServerErrors] = useState<FieldErrors>({})
	const id = useId()

	const form = useForm({
		defaultValues: { login: '', password: '' },
		validators: { onSubmit: loginSchema },
		onSubmit: async ({ value }) => {
			setMessage(undefined)
			setServerErrors({})
			const result = await onSubmit(loginSchema.parse(value))
			setMessage(result?.message)
			setServerErrors(result?.fieldErrors ?? {})
			if (result?.clearPassword) form.setFieldValue('password', '')
		},
	})

	return (
		<Card className='w-full max-w-sm'>
			<CardHeader>
				<CardTitle className='text-2xl'>Educare</CardTitle>
				<CardDescription>Entre com seu email e senha.</CardDescription>
			</CardHeader>
			<CardContent>
				{/* noValidate: a validação é a do loginSchema, não a do navegador. */}
				<form
					noValidate
					className='flex flex-col gap-4'
					onSubmit={(event) => {
						event.preventDefault()
						form.handleSubmit()
					}}
				>
					{notice && (
						<Alert>
							<Info />
							<AlertDescription>{notice}</AlertDescription>
						</Alert>
					)}

					{message && (
						<Alert variant='destructive'>
							<CircleAlert />
							<AlertDescription>{message}</AlertDescription>
						</Alert>
					)}

					<form.Field name='login'>
						{(field) => {
							const error =
								firstError(field.state.meta.errors) ?? serverErrors?.login
							const errorId = `${id}-login-error`
							return (
								<div className='flex flex-col gap-2'>
									<Label htmlFor={`${id}-login`}>Email</Label>
									<Input
										id={`${id}-login`}
										name={field.name}
										type='email'
										autoComplete='username'
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => {
											field.handleChange(event.target.value)
											setServerErrors((errors) => ({
												...errors,
												[field.name]: undefined,
											}))
										}}
										aria-invalid={error ? true : undefined}
										aria-describedby={error ? errorId : undefined}
									/>
									{error && (
										<p id={errorId} className='text-sm text-destructive'>
											{error}
										</p>
									)}
								</div>
							)
						}}
					</form.Field>

					<form.Field name='password'>
						{(field) => {
							const error =
								firstError(field.state.meta.errors) ?? serverErrors?.password
							const errorId = `${id}-password-error`
							return (
								<div className='flex flex-col gap-2'>
									<Label htmlFor={`${id}-password`}>Senha</Label>
									<Input
										id={`${id}-password`}
										name={field.name}
										type='password'
										autoComplete='current-password'
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => {
											field.handleChange(event.target.value)
											setServerErrors((errors) => ({
												...errors,
												[field.name]: undefined,
											}))
										}}
										aria-invalid={error ? true : undefined}
										aria-describedby={error ? errorId : undefined}
									/>
									{error && (
										<p id={errorId} className='text-sm text-destructive'>
											{error}
										</p>
									)}
								</div>
							)
						}}
					</form.Field>

					<form.Subscribe selector={(state) => state.isSubmitting}>
						{(isSubmitting) => (
							<Button type='submit' disabled={isSubmitting}>
								Entrar
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	)
}
