import { useForm } from '@tanstack/react-form'
import { CircleAlert } from 'lucide-react'
import { type Ref, useId, useState } from 'react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import type { ClassroomResult } from '#/integrations/educare-api/classrooms'
import {
	type ClassroomNameValues,
	classroomNameSchema,
} from '#/integrations/educare-api/validation'
import { studentsInClassroom } from './format'

export type ClassroomFormProps = {
	mode: 'create' | 'edit'
	initialName?: string
	/** Alunos da turma, mostrado só ao editar. */
	studentCount?: number
	placeholder?: string
	onSubmit: (values: ClassroomNameValues) => Promise<ClassroomResult>
	/** Recebe o resultado que não foi um erro do formulário (sucesso ou 404). */
	onDone: (result: ClassroomResult) => void
	onCancel: () => void
	/** Recebe o campo "Nome da turma", que o modal foca ao abrir. */
	nameRef?: Ref<HTMLInputElement>
}

type FieldError = string | { message?: string } | undefined

function firstError(errors: FieldError[]) {
	const [error] = errors
	return typeof error === 'string' ? error : error?.message
}

/**
 * Conteúdo dos modais "Nova turma" e "Editar turma". O modal desmonta o
 * formulário ao fechar, o que descarta o valor e os erros.
 */
export function ClassroomForm({
	mode,
	initialName = '',
	studentCount,
	placeholder,
	onSubmit,
	onDone,
	onCancel,
	nameRef,
}: ClassroomFormProps) {
	const [message, setMessage] = useState<string>()
	const [serverError, setServerError] = useState<string>()
	const id = useId()

	const form = useForm({
		defaultValues: { name: initialName } as ClassroomNameValues,
		validators: { onSubmit: classroomNameSchema },
		onSubmit: async ({ value }) => {
			setMessage(undefined)
			setServerError(undefined)
			// O validador não transforma o valor: envia o nome já sem os espaços.
			const result = await onSubmit(classroomNameSchema.parse(value))
			if (result.ok || result.kind === 'not-found') {
				onDone(result)
				return
			}
			setMessage(result.message)
			setServerError(result.fieldErrors.name)
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

			<form.Field name='name'>
				{(field) => {
					const error = firstError(field.state.meta.errors) ?? serverError
					const inputId = `${id}-name`
					const hintId =
						mode === 'edit' && studentCount !== undefined
							? `${inputId}-hint`
							: undefined
					const errorId = error ? `${inputId}-error` : undefined
					const describedBy = [errorId, hintId].filter(Boolean).join(' ')
					return (
						<div className='flex flex-col gap-2'>
							<Label htmlFor={inputId}>Nome da turma</Label>
							<Input
								ref={nameRef}
								id={inputId}
								name='name'
								autoComplete='off'
								className='h-11'
								placeholder={placeholder}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => {
									field.handleChange(event.target.value)
									setServerError(undefined)
								}}
								aria-invalid={error ? true : undefined}
								aria-describedby={describedBy || undefined}
							/>
							{errorId && (
								<p id={errorId} className='text-sm text-destructive'>
									{error}
								</p>
							)}
							{hintId && studentCount !== undefined && (
								<p id={hintId} className='text-xs text-muted-foreground'>
									{studentsInClassroom(studentCount)}
								</p>
							)}
						</div>
					)
				}}
			</form.Field>

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
							{mode === 'create' ? 'Criar turma' : 'Salvar alterações'}
						</Button>
					</div>
				)}
			</form.Subscribe>
		</form>
	)
}
