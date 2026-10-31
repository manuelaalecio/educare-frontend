import { useForm } from '@tanstack/react-form'
import { CircleAlert } from 'lucide-react'
import { type Ref, useId, useState } from 'react'
import { z } from 'zod'
import { PasswordInput } from '#/components/auth/password-input'
import { roleLabel } from '#/components/layout/user'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#/components/ui/select'
import type { UserResult } from '#/integrations/educare-api/users'
import {
	type CreateUserValues,
	createUserSchema,
	type Role,
	userFieldsSchema,
} from '#/integrations/educare-api/validation'
import { describedBy, firstError } from './field'

type FieldName = keyof CreateUserValues

// Educador(a) primeiro: é a função de quase toda a equipe e o padrão.
const roleOptions: Role[] = ['EDUCADOR', 'COORDENADOR']

export type UserFormProps = {
	mode: 'create' | 'edit'
	initialValues?: Omit<CreateUserValues, 'password'>
	/** Recebe os valores já sem espaços nas pontas; ao editar, sem a senha. */
	onSubmit: (values: CreateUserValues) => Promise<UserResult>
	/** Recebe o resultado que não foi um erro do formulário (sucesso ou 404). */
	onDone: (result: UserResult) => void
	onCancel: () => void
	/** Recebe o campo "Nome", que o modal foca ao abrir. */
	nameRef?: Ref<HTMLInputElement>
}

// Ao editar não há senha: o campo fica vazio e não é enviado.
const editUserSchema = userFieldsSchema.extend({ password: z.string() })

const emptyValues: CreateUserValues = {
	name: '',
	login: '',
	password: '',
	role: 'EDUCADOR',
}

/**
 * Conteúdo dos modais "Novo usuário" e "Editar usuário". O modal desmonta o
 * formulário ao fechar, o que descarta os valores (inclusive a senha) e os
 * erros.
 */
export function UserForm({
	mode,
	initialValues,
	onSubmit,
	onDone,
	onCancel,
	nameRef,
}: UserFormProps) {
	const [message, setMessage] = useState<string>()
	const [serverErrors, setServerErrors] = useState<
		Partial<Record<FieldName, string>>
	>({})
	const id = useId()
	const schema = mode === 'create' ? createUserSchema : editUserSchema

	const form = useForm({
		defaultValues: { ...emptyValues, ...initialValues },
		validators: { onSubmit: schema },
		onSubmit: async ({ value }) => {
			setMessage(undefined)
			setServerErrors({})
			// O validador não transforma os valores: envia já sem os espaços.
			const result = await onSubmit(schema.parse(value))
			if (result.ok || result.kind === 'not-found') {
				onDone(result)
				return
			}
			setMessage(result.message)
			setServerErrors(result.fieldErrors)
		},
	})

	const clearServerError = (name: FieldName) =>
		setServerErrors((errors) => ({ ...errors, [name]: undefined }))

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

			{(['name', 'login'] as const).map((name) => (
				<form.Field key={name} name={name}>
					{(field) => {
						const error =
							firstError(field.state.meta.errors) ?? serverErrors[name]
						const inputId = `${id}-${name}`
						const errorId = error ? `${inputId}-error` : undefined
						return (
							<div className='flex flex-col gap-2'>
								<Label htmlFor={inputId}>
									{name === 'name' ? 'Nome' : 'Email'}
								</Label>
								<Input
									ref={name === 'name' ? nameRef : undefined}
									id={inputId}
									name={name}
									type={name === 'login' ? 'email' : 'text'}
									autoComplete='off'
									className='h-11'
									placeholder={
										name === 'name' ? 'Nome completo' : 'nome@educare.org'
									}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => {
										field.handleChange(event.target.value)
										clearServerError(name)
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

			{mode === 'create' && (
				<form.Field name='password'>
					{(field) => {
						const error =
							firstError(field.state.meta.errors) ?? serverErrors.password
						const inputId = `${id}-password`
						const errorId = error ? `${inputId}-error` : undefined
						return (
							<div className='flex flex-col gap-2'>
								<Label htmlFor={inputId}>Senha</Label>
								<PasswordInput
									id={inputId}
									name='password'
									label='Senha'
									placeholder='Senha inicial'
									autoComplete='new-password'
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => {
										field.handleChange(event.target.value)
										clearServerError('password')
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
			)}

			<form.Field name='role'>
				{(field) => {
					const error = firstError(field.state.meta.errors) ?? serverErrors.role
					const triggerId = `${id}-role`
					const hintId = `${triggerId}-hint`
					const errorId = error ? `${triggerId}-error` : undefined
					return (
						<div className='flex flex-col gap-2'>
							<Label htmlFor={triggerId}>Função</Label>
							<Select
								name='role'
								value={field.state.value}
								onValueChange={(value) => {
									field.handleChange(value as Role)
									clearServerError('role')
								}}
							>
								<SelectTrigger
									id={triggerId}
									className='h-11 w-full'
									onBlur={field.handleBlur}
									aria-invalid={error ? true : undefined}
									aria-describedby={describedBy(hintId, errorId)}
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{roleOptions.map((role) => (
										<SelectItem key={role} value={role}>
											{roleLabel(role)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p id={hintId} className='text-xs text-muted-foreground'>
								Coordenadores(as) também acessam as configurações.
							</p>
							{errorId && (
								<p id={errorId} className='text-sm text-destructive'>
									{error}
								</p>
							)}
						</div>
					)
				}}
			</form.Field>

			{mode === 'edit' && (
				<p className='text-xs text-muted-foreground'>
					Para trocar a senha, use “Redefinir senha” na lista de usuários.
				</p>
			)}

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
							{mode === 'create' ? 'Criar usuário' : 'Salvar alterações'}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	)
}
