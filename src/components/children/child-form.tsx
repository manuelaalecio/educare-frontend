import { revalidateLogic, useForm } from '@tanstack/react-form'
import {
	isRedirect,
	Link,
	useBlocker,
	useNavigate,
} from '@tanstack/react-router'
import { CircleAlert, Info } from 'lucide-react'
import { type ReactNode, useId, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
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
import { Textarea } from '#/components/ui/textarea'
import { describedBy, firstError } from '#/components/users/field'
import type { Classroom } from '#/integrations/educare-api/classrooms'
import { ApiFieldError } from '#/integrations/educare-api/errors'
import { messages } from '#/integrations/educare-api/messages'
import {
	type ChildFormValues,
	type ChildRequest,
	childFormSchema,
	GENDERS,
	MARITAL_STATUSES,
	RACES,
	toChildRequest,
	UFS,
} from '#/integrations/educare-api/validation'
import {
	BIRTH_CERTIFICATE_MASK,
	CEP_MASK,
	CPF_MASK,
	formatMasked,
	genderLabels,
	maritalStatusLabels,
	raceLabels,
} from './format'
import { LeaveDialog } from './leave-dialog'

type FieldName = keyof ChildFormValues

type Option = { value: string; label: string }

type FieldConfig = {
	name: FieldName
	label: string
	kind: 'text' | 'date' | 'textarea' | 'select'
	required?: boolean
	mask?: string
	hint?: string
	options?: Option[]
	autoComplete?: string
	/** Ocupa a linha inteira na grade de duas colunas. */
	wide?: boolean
}

type Section = { title: string; fields: FieldConfig[] }

// Valor interno de "Não informar": o `Select` do Radix não aceita `''` num
// item (design, D9).
const NONE = 'none'

const options = (values: readonly string[], labels?: Record<string, string>) =>
	values.map((value) => ({ value, label: labels?.[value] ?? value }))

const SECTIONS: Section[] = [
	{
		title: 'Dados pessoais',
		fields: [
			{
				name: 'name',
				label: 'Nome completo',
				kind: 'text',
				required: true,
				wide: true,
			},
			{
				name: 'birthDate',
				label: 'Data de nascimento',
				kind: 'date',
				required: true,
			},
			{ name: 'birthplace', label: 'Naturalidade', kind: 'text' },
			{ name: 'nationality', label: 'Nacionalidade', kind: 'text' },
			{
				name: 'gender',
				label: 'Gênero',
				kind: 'select',
				options: options(GENDERS, genderLabels),
			},
			{
				name: 'race',
				label: 'Raça/cor',
				kind: 'select',
				options: options(RACES, raceLabels),
			},
			{
				name: 'maritalStatus',
				label: 'Estado civil',
				kind: 'select',
				options: options(MARITAL_STATUSES, maritalStatusLabels),
			},
		],
	},
	{
		title: 'Documentos',
		fields: [
			{ name: 'cpf', label: 'CPF', kind: 'text', mask: CPF_MASK },
			{ name: 'rg', label: 'RG', kind: 'text' },
			{
				name: 'birthCertificateNumber',
				label: 'Matrícula da certidão',
				kind: 'text',
				mask: BIRTH_CERTIFICATE_MASK,
				hint: '32 números, no alto da certidão',
				wide: true,
			},
		],
	},
	{
		title: 'Endereço',
		fields: [
			{
				name: 'cep',
				label: 'CEP',
				kind: 'text',
				required: true,
				mask: CEP_MASK,
			},
			{
				name: 'address',
				label: 'Endereço',
				kind: 'text',
				required: true,
				wide: true,
			},
			{ name: 'addressNumber', label: 'Número', kind: 'text', required: true },
			{ name: 'addressComplement', label: 'Complemento', kind: 'text' },
			{ name: 'neighborhood', label: 'Bairro', kind: 'text', required: true },
			{ name: 'city', label: 'Cidade', kind: 'text', required: true },
			{
				name: 'state',
				label: 'UF',
				kind: 'select',
				required: true,
				options: options(UFS),
			},
		],
	},
	{
		title: 'Religião',
		fields: [
			{ name: 'religion', label: 'Religião', kind: 'text' },
			{ name: 'church', label: 'Igreja', kind: 'text' },
		],
	},
	{
		title: 'Saúde',
		fields: [
			{ name: 'healthReport', label: 'Laudo', kind: 'textarea', wide: true },
			{ name: 'medication', label: 'Medicação', kind: 'textarea', wide: true },
			{
				name: 'medicalObservation',
				label: 'Observação médica',
				kind: 'textarea',
				wide: true,
			},
		],
	},
]

/** Ordem dos campos no formulário, para focar o primeiro com erro. */
const FIELD_ORDER: FieldName[] = [
	'classroomId',
	...SECTIONS.flatMap((section) => section.fields.map((field) => field.name)),
]

export type ChildFormProps = {
	mode: 'create' | 'edit'
	defaultValues: ChildFormValues
	/** Turmas para o seletor; vazio no cadastro troca o seletor pelo aviso. */
	classrooms: Pick<Classroom, 'id' | 'name'>[]
	/** Na edição, a turma atual, para o aviso de troca de turma. */
	currentClassroom?: { id: string; name: string }
	/** Mostra "Ir para Turmas" no aviso de que não há turmas. */
	canManageClassrooms: boolean
	/** Grava e devolve o id da criança; lança `ApiFieldError` se falhar. */
	onSave: (body: ChildRequest) => Promise<{ id: string }>
	/** Destino de "Cancelar": a lista (cadastro) ou os detalhes (edição). */
	cancel: ReactNode
}

// O "*" dos obrigatórios vem do CSS (`::after`): aparece no rótulo, mas fica
// fora do nome acessível, que já tem o `aria-required` do campo.
const REQUIRED_LABEL = "after:-ml-1 after:text-destructive after:content-['*']"

function FieldLabel({
	htmlFor,
	required,
	children,
}: {
	htmlFor: string
	required?: boolean
	children: ReactNode
}) {
	return (
		<Label
			htmlFor={htmlFor}
			data-required={required ? 'true' : undefined}
			className={required ? REQUIRED_LABEL : undefined}
		>
			{children}
		</Label>
	)
}

/**
 * Formulário de cadastro e edição de criança (design, D9): seções, máscaras,
 * erros do schema e da API nos campos, alerta no topo e bloqueio de saída
 * com alterações não salvas.
 */
export function ChildForm({
	mode,
	defaultValues,
	classrooms,
	currentClassroom,
	canManageClassrooms,
	onSave,
	cancel,
}: ChildFormProps) {
	const id = useId()
	const navigate = useNavigate()
	const [message, setMessage] = useState<string>()
	const [serverErrors, setServerErrors] = useState<
		Partial<Record<FieldName, string>>
	>({})
	// Depois de salvar, a navegação para os detalhes não pergunta nada.
	const saved = useRef(false)
	const noClassrooms = classrooms.length === 0
	const sortedClassrooms = useMemo(
		() =>
			[...classrooms].sort((a, b) =>
				a.name.localeCompare(b.name, 'pt-BR', { numeric: true }),
			),
		[classrooms],
	)

	const inputId = (name: FieldName) => `${id}-${name}`
	const focusField = (name: FieldName) =>
		document.getElementById(inputId(name))?.focus()

	const form = useForm({
		defaultValues,
		// Valida no envio e, depois da primeira tentativa, a cada mudança: o erro
		// só some quando o campo fica certo (sair do campo não o apaga).
		validationLogic: revalidateLogic({
			mode: 'submit',
			modeAfterSubmission: 'change',
		}),
		validators: { onDynamic: childFormSchema },
		onSubmit: async ({ value }) => {
			setMessage(undefined)
			setServerErrors({})
			try {
				const { id: childId } = await onSave(
					toChildRequest(childFormSchema.parse(value)),
				)
				saved.current = true
				toast.success(
					mode === 'create' ? messages.childCreated : messages.childUpdated,
				)
				await navigate({ to: '/criancas/$childId', params: { childId } })
			} catch (error) {
				// O `401` já levou ao login pelo fluxo de sessão expirada.
				if (isRedirect(error)) return
				if (!(error instanceof ApiFieldError)) {
					setMessage(messages.unavailable)
					return
				}
				const known = FIELD_ORDER.filter((name) => error.fieldErrors[name])
				setServerErrors(error.fieldErrors)
				setMessage(
					error.message ||
						(known.length === 0 ? messages.validation : undefined),
				)
				if (known.length > 0) focusField(known[0])
			}
		},
		onSubmitInvalid: ({ formApi }) => {
			const first = FIELD_ORDER.find(
				(name) => (formApi.getFieldMeta(name)?.errors.length ?? 0) > 0,
			)
			if (first) focusField(first)
		},
	})

	const blocker = useBlocker({
		shouldBlockFn: ({ next }) =>
			form.state.isDirty &&
			!saved.current &&
			// A sessão expirada manda para o login sem perguntar.
			next.pathname !== '/login',
		enableBeforeUnload: () => form.state.isDirty && !saved.current,
		withResolver: true,
	})

	const clearServerError = (name: FieldName) =>
		setServerErrors((errors) =>
			errors[name] ? { ...errors, [name]: undefined } : errors,
		)

	function renderField(config: FieldConfig) {
		return (
			<form.Field key={config.name} name={config.name}>
				{(field) => {
					const error =
						firstError(field.state.meta.errors) ?? serverErrors[config.name]
					const controlId = inputId(config.name)
					const hintId = config.hint ? `${controlId}-hint` : undefined
					const errorId = error ? `${controlId}-error` : undefined
					const aria = {
						'aria-invalid': error ? true : undefined,
						'aria-describedby': describedBy(hintId, errorId),
						'aria-required': config.required ? true : undefined,
					}
					const change = (value: string) => {
						field.handleChange(value as never)
						clearServerError(config.name)
					}
					const value = field.state.value as string

					let control: ReactNode
					if (config.kind === 'select') {
						control = (
							<Select
								name={config.name}
								value={config.required ? value : value || NONE}
								onValueChange={(next) => change(next === NONE ? '' : next)}
							>
								<SelectTrigger
									id={controlId}
									className='h-11 w-full'
									onBlur={field.handleBlur}
									{...aria}
								>
									<SelectValue placeholder='Escolha' />
								</SelectTrigger>
								<SelectContent>
									{!config.required && (
										<SelectItem value={NONE}>Não informar</SelectItem>
									)}
									{config.options?.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)
					} else if (config.kind === 'textarea') {
						control = (
							<Textarea
								id={controlId}
								name={config.name}
								rows={3}
								value={value}
								onBlur={field.handleBlur}
								onChange={(event) => change(event.target.value)}
								{...aria}
							/>
						)
					} else {
						const { mask } = config
						control = (
							<Input
								id={controlId}
								name={config.name}
								type={config.kind === 'date' ? 'date' : 'text'}
								autoComplete='off'
								inputMode={mask ? 'numeric' : undefined}
								placeholder={mask}
								className='h-11'
								value={value}
								onBlur={field.handleBlur}
								onChange={(event) =>
									change(
										mask
											? formatMasked(event.target.value, mask)
											: event.target.value,
									)
								}
								{...aria}
							/>
						)
					}

					return (
						<div
							className={
								config.wide
									? 'flex flex-col gap-2 sm:col-span-2'
									: 'flex flex-col gap-2'
							}
						>
							<FieldLabel htmlFor={controlId} required={config.required}>
								{config.label}
							</FieldLabel>
							{control}
							{hintId && (
								<p id={hintId} className='text-xs text-muted-foreground'>
									{config.hint}
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
		)
	}

	return (
		<>
			{/* `post`: se a usuária enviar antes da hidratação, o envio nativo
			    não põe CPF, endereço e saúde na URL (LGPD). */}
			<form
				method='post'
				noValidate
				className='flex flex-col gap-6'
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

				<FormSection id={`${id}-turma`} title='Turma'>
					{noClassrooms ? (
						<Alert className='sm:col-span-2'>
							<Info />
							<AlertTitle>Cadastre uma turma antes.</AlertTitle>
							<AlertDescription>
								{canManageClassrooms ? (
									<Link
										to='/configuracoes/turmas'
										className='font-medium text-primary underline underline-offset-4'
									>
										Ir para Turmas
									</Link>
								) : (
									'Peça a um(a) coordenador(a) para cadastrar uma turma.'
								)}
							</AlertDescription>
						</Alert>
					) : (
						<form.Field name='classroomId'>
							{(field) => {
								const error =
									firstError(field.state.meta.errors) ??
									serverErrors.classroomId
								const controlId = inputId('classroomId')
								const errorId = error ? `${controlId}-error` : undefined
								const chosen = sortedClassrooms.find(
									(classroom) => classroom.id === field.state.value,
								)
								const moving =
									currentClassroom &&
									chosen &&
									chosen.id !== currentClassroom.id
								const moveId = moving ? `${controlId}-move` : undefined
								return (
									<div className='flex flex-col gap-2'>
										<FieldLabel htmlFor={controlId} required>
											Turma
										</FieldLabel>
										<Select
											name='classroomId'
											value={field.state.value}
											onValueChange={(value) => {
												field.handleChange(value)
												clearServerError('classroomId')
											}}
										>
											<SelectTrigger
												id={controlId}
												className='h-11 w-full'
												onBlur={field.handleBlur}
												aria-invalid={error ? true : undefined}
												aria-describedby={describedBy(moveId, errorId)}
												aria-required
											>
												<SelectValue placeholder='Escolha a turma' />
											</SelectTrigger>
											<SelectContent>
												{sortedClassrooms.map((classroom) => (
													<SelectItem key={classroom.id} value={classroom.id}>
														{classroom.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{moving && (
											<p
												id={moveId}
												className='rounded-md bg-muted px-3 py-2 text-sm text-foreground'
											>
												A criança sai da {currentClassroom.name} hoje e entra na{' '}
												{chosen.name}. A mudança fica no histórico.
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
					)}
				</FormSection>

				{SECTIONS.map((section, index) => (
					<FormSection
						key={section.title}
						id={`${id}-secao-${index}`}
						title={section.title}
					>
						{section.fields.map(renderField)}
					</FormSection>
				))}

				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(isSubmitting) => (
						<div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
							<Button asChild variant='outline' className='h-11'>
								{cancel}
							</Button>
							<Button
								type='submit'
								className='h-11'
								disabled={isSubmitting || noClassrooms}
							>
								{mode === 'create' ? 'Cadastrar criança' : 'Salvar alterações'}
							</Button>
						</div>
					)}
				</form.Subscribe>
			</form>

			<LeaveDialog
				open={blocker.status === 'blocked'}
				onStay={() => blocker.reset?.()}
				onLeave={() => blocker.proceed?.()}
			/>
		</>
	)
}

function FormSection({
	id,
	title,
	children,
}: {
	id: string
	title: string
	children: ReactNode
}) {
	const headingId = `${id}-titulo`
	return (
		<section
			aria-labelledby={headingId}
			className='flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-xs md:p-6'
		>
			<h2 id={headingId} className='text-lg font-semibold'>
				{title}
			</h2>
			<div className='grid gap-4 sm:grid-cols-2'>{children}</div>
		</section>
	)
}
