import { createRoute } from '@tanstack/react-router'
import {
	cleanup,
	fireEvent,
	render,
	waitFor,
	within,
} from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '#/components/ui/sonner'
import type { Child } from '#/integrations/educare-api/children'
import type { Classroom } from '#/integrations/educare-api/classrooms'
import {
	createChild,
	getChild,
	getClassrooms,
	getCurrentUser,
	updateChild,
} from '#/integrations/educare-api/functions'
import { messages } from '#/integrations/educare-api/messages'
import { keys } from '#/integrations/educare-api/queries'
import { attach, renderRoutes } from '#/testing/render-route'
import { Route as AuthenticatedRoute } from './_authenticated'
import { Route as EditChildRoute } from './_authenticated/criancas/$childId/editar'
import { Route as NewChildRoute } from './_authenticated/criancas/nova'

vi.mock('#/integrations/educare-api/functions', () => ({
	login: vi.fn(),
	logout: vi.fn(),
	getCurrentUser: vi.fn(),
	getClassrooms: vi.fn(),
	getChildren: vi.fn(),
	getChild: vi.fn(),
	getChildClassrooms: vi.fn(),
	createChild: vi.fn(),
	updateChild: vi.fn(),
	deleteChild: vi.fn(),
}))

vi.mock('#/components/layout/sidebar-state', () => ({
	readSidebarOpen: vi.fn(() => true),
}))

vi.mock('#/integrations/educare-api/cache', () => ({
	preventCaching: vi.fn(),
}))

vi.mock('@tanstack/react-start', async (importOriginal) => ({
	...(await importOriginal<typeof import('@tanstack/react-start')>()),
	useServerFn: (fn: unknown) => fn,
}))

const sessionMock = vi.mocked(getCurrentUser)
const classroomsMock = vi.mocked(getClassrooms)
const getChildMock = vi.mocked(getChild)
const createMock = vi.mocked(createChild)
const updateMock = vi.mocked(updateChild)

const CHILD_ID = '6f1c2c8e-1d1a-4c5e-9a1b-2b3c4d5e6f70'
const NEW_ID = '7f1d2c3b-4a5e-4f60-8a71-9b8c7d6e5f40'

function user(role: 'COORDENADOR' | 'EDUCADOR') {
	return {
		id: '2',
		name: 'Maria',
		login: 'maria@educare.org',
		role,
		createdAt: '2026-01-10T12:00:00Z',
	}
}

function classroom(name: string): Classroom {
	return {
		id: `id-${name}`,
		name,
		studentCount: 0,
		maleCount: 0,
		femaleCount: 0,
		createdAt: '2026-02-02T13:00:00Z',
	}
}

const turma1 = classroom('Turma 1')
const turma2 = classroom('Turma 2')

const ana: Child = {
	id: CHILD_ID,
	name: 'Ana Lima',
	birthDate: '2022-03-15',
	cpf: '52998224725',
	birthCertificateNumber: '10453901552013100012021000012321',
	cep: '01310100',
	address: 'Avenida Paulista',
	addressNumber: '1000',
	neighborhood: 'Bela Vista',
	city: 'São Paulo',
	state: 'SP',
	classroom: { id: turma1.id, name: 'Turma 1' },
	createdAt: '2026-10-01T12:00:00Z',
	updatedAt: '2026-10-01T12:00:00Z',
}

type Options = {
	role?: 'COORDENADOR' | 'EDUCADOR'
	classrooms?: Classroom[]
	child?: Child | null
	/** Resultado de `getChild` no lugar de `{ ok: true, child }`. */
	childResult?: unknown
}

async function open(url: string, options: Options = {}) {
	const { role = 'COORDENADOR', classrooms = [turma2, turma1] } = options
	sessionMock.mockResolvedValue({ user: user(role), expired: false } as never)
	classroomsMock.mockResolvedValue({ ok: true, classrooms } as never)
	getChildMock.mockResolvedValue(
		(options.childResult ?? {
			ok: true,
			child: options.child === undefined ? ana : options.child,
		}) as never,
	)
	render(<Toaster />)
	return renderRoutes(url, (root) => {
		const layout = attach(AuthenticatedRoute, root, { id: '/_authenticated' })
		return [
			layout.addChildren([
				attach(NewChildRoute, layout, {
					id: '/criancas/nova',
					path: '/criancas/nova',
				}),
				attach(EditChildRoute, layout, {
					id: '/criancas/$childId/editar',
					path: '/criancas/$childId/editar',
				}),
				createRoute({
					getParentRoute: () => layout,
					path: '/criancas/$childId',
					component: () => <p>Detalhes da criança</p>,
				}),
			]),
		]
	})
}

// As seções também têm nome ("Endereço", "Religião"): só os campos contam.
const CONTROLS = 'input, textarea, button'

type Screen = Awaited<ReturnType<typeof open>>['screen']

function type(screen: Screen, label: string, value: string) {
	fireEvent.change(screen.getByLabelText(label, { selector: CONTROLS }), {
		target: { value },
	})
}

async function choose(screen: Screen, label: string, option: string) {
	const trigger = screen.getByRole('combobox', { name: label })
	fireEvent.keyDown(trigger, { key: 'ArrowDown' })
	fireEvent.click(await screen.findByRole('option', { name: option }))
	// O Radix devolve o foco ao seletor num `setTimeout` depois de fechar.
	await waitFor(() => expect(document.activeElement).toBe(trigger))
}

async function fillRequired(screen: Screen) {
	await choose(screen, 'Turma', 'Turma 1')
	type(screen, 'Nome completo', 'Ana Lima')
	type(screen, 'Data de nascimento', '2022-03-15')
	type(screen, 'CEP', '01310100')
	type(screen, 'Endereço', 'Avenida Paulista')
	type(screen, 'Número', '1000')
	type(screen, 'Bairro', 'Bela Vista')
	type(screen, 'Cidade', 'São Paulo')
	await choose(screen, 'UF', 'SP')
}

/** Textos ligados ao campo por `aria-describedby`. */
function describedBy(element: HTMLElement) {
	return (element.getAttribute('aria-describedby') ?? '')
		.split(' ')
		.filter(Boolean)
		.map((id) => document.getElementById(id)?.textContent)
}

/** O rótulo tem o "*" (desenhado pelo CSS) quando o campo é obrigatório. */
function isRequired(screen: Screen, label: string) {
	const control = screen.getByLabelText(label, { selector: CONTROLS })
	const element = document.querySelector(`label[for="${control.id}"]`)
	return (
		element?.getAttribute('data-required') === 'true' &&
		control.getAttribute('aria-required') === 'true'
	)
}

/** Como um clique de verdade: o botão recebe o foco antes do envio. */
function submit(screen: Screen, name = 'Cadastrar criança') {
	const button = screen.getByRole('button', { name })
	button.focus()
	fireEvent.click(button)
}

function sent() {
	expect(createMock).toHaveBeenCalledTimes(1)
	return createMock.mock.calls[0][0] as unknown as {
		data: Record<string, unknown>
	}
}

function deferred<T>() {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((r) => {
		resolve = r
	})
	return { promise, resolve }
}

async function headTitle(
	route: typeof EditChildRoute | typeof NewChildRoute,
	match: unknown,
) {
	const head = await route.options.head?.({ match } as never)
	return head?.meta?.find((meta) => meta && 'title' in meta)
}

beforeEach(() => {
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	)
	// O jsdom não tem o que o Select do Radix usa para abrir a lista.
	Element.prototype.scrollIntoView = vi.fn()
	Element.prototype.hasPointerCapture = vi.fn(() => false)
	Element.prototype.releasePointerCapture = vi.fn()
})

afterEach(() => {
	toast.dismiss()
	cleanup()
	vi.clearAllMocks()
	vi.unstubAllGlobals()
	vi.useRealTimers()
})

describe('formulário de criança', () => {
	it('abre o cadastro vazio, com as seções, os rótulos e "Cadastrar criança"', async () => {
		const { screen } = await open('/criancas/nova')

		expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(
			'Nova criança',
		)
		expect(
			screen
				.getAllByRole('heading', { level: 2 })
				.map((heading) => heading.textContent),
		).toEqual([
			'Turma',
			'Dados pessoais',
			'Documentos',
			'Endereço',
			'Religião',
			'Saúde',
		])
		for (const label of [
			'Nome completo',
			'Data de nascimento',
			'CEP',
			'Endereço',
			'Número',
			'Bairro',
			'Cidade',
			'UF',
			'Turma',
		]) {
			expect(isRequired(screen, label)).toBe(true)
		}
		for (const label of [
			'Naturalidade',
			'Nacionalidade',
			'CPF',
			'RG',
			'Matrícula da certidão',
			'Complemento',
			'Religião',
			'Igreja',
		]) {
			expect(isRequired(screen, label)).toBe(false)
			expect(
				(
					screen.getByLabelText(label, {
						selector: CONTROLS,
					}) as HTMLInputElement
				).value,
			).toBe('')
		}
		for (const label of ['Laudo', 'Medicação', 'Observação médica']) {
			expect(screen.getByLabelText(label, { selector: CONTROLS }).tagName).toBe(
				'TEXTAREA',
			)
		}
		expect(
			screen.getByRole('button', { name: 'Cadastrar criança' }),
		).toBeDefined()
		expect(
			screen.getByRole('link', { name: 'Cancelar' }).getAttribute('href'),
		).toBe('/criancas')
		expect(await headTitle(NewChildRoute, {})).toEqual({
			title: 'Nova criança · Educare',
		})
	})

	it('envia por POST se a usuária enviar antes da hidratação, sem dados na URL', async () => {
		const { screen } = await open('/criancas/nova')

		const button = await screen.findByRole('button', {
			name: 'Cadastrar criança',
		})
		expect(button.closest('form')?.getAttribute('method')).toBe('post')
	})

	it('lista as turmas em ordem alfabética', async () => {
		const { screen } = await open('/criancas/nova')
		fireEvent.keyDown(await screen.findByRole('combobox', { name: 'Turma' }), {
			key: 'ArrowDown',
		})
		const options = await screen.findAllByRole('option')
		expect(options.map((option) => option.textContent)).toEqual([
			'Turma 1',
			'Turma 2',
		])
	})

	it('tem "Não informar" nos seletores opcionais e traduz as opções', async () => {
		const { screen } = await open('/criancas/nova')
		await screen.findByRole('combobox', { name: 'Gênero' })
		const cases = {
			Gênero: ['Não informar', 'Feminino', 'Masculino', 'Outro'],
			'Raça/cor': [
				'Não informar',
				'Branca',
				'Preta',
				'Parda',
				'Amarela',
				'Indígena',
			],
			'Estado civil': [
				'Não informar',
				'Solteiro(a)',
				'Casado(a)',
				'União estável',
				'Divorciado(a)',
				'Viúvo(a)',
			],
		}
		for (const [label, expected] of Object.entries(cases)) {
			fireEvent.keyDown(screen.getByRole('combobox', { name: label }), {
				key: 'ArrowDown',
			})
			const options = await screen.findAllByRole('option')
			expect(options.map((option) => option.textContent)).toEqual(expected)
			fireEvent.click(screen.getByRole('option', { name: 'Não informar' }))
		}
		fireEvent.keyDown(screen.getByRole('combobox', { name: 'UF' }), {
			key: 'ArrowDown',
		})
		const ufs = await screen.findAllByRole('option')
		expect(ufs).toHaveLength(27)
		expect(ufs.map((option) => option.textContent)).not.toContain(
			'Não informar',
		)
	})

	it('aplica as máscaras de CPF, CEP e matrícula', async () => {
		const { screen } = await open('/criancas/nova')
		await screen.findByLabelText('CPF', { selector: CONTROLS })
		type(screen, 'CPF', '52998224725999')
		type(screen, 'CEP', '01310100')
		type(screen, 'Matrícula da certidão', '10453901552013100012021000012321')

		expect(
			(screen.getByLabelText('CPF', { selector: CONTROLS }) as HTMLInputElement)
				.value,
		).toBe('529.982.247-25')
		expect(
			(screen.getByLabelText('CEP', { selector: CONTROLS }) as HTMLInputElement)
				.value,
		).toBe('01310-100')
		const certificate = screen.getByLabelText('Matrícula da certidão', {
			selector: CONTROLS,
		}) as HTMLInputElement
		expect(certificate.value).toBe('104539 01 55 2013 1 00012 021 0000123 21')
		expect(describedBy(certificate)).toEqual([
			'32 números, no alto da certidão',
		])
	})
})

describe('validação do formulário de criança', () => {
	it('mostra cada obrigatório, foca "Turma" e não envia', async () => {
		const { screen } = await open('/criancas/nova')
		await screen.findByRole('combobox', { name: 'Turma' })
		submit(screen)

		for (const message of [
			'Escolha a turma.',
			'Informe o nome completo.',
			'Informe a data de nascimento.',
			'Informe o CEP.',
			'Informe o endereço.',
			'Informe o número.',
			'Informe o bairro.',
			'Informe a cidade.',
			'Escolha a UF.',
		]) {
			expect(await screen.findByText(message)).toBeDefined()
		}
		const classroomField = screen.getByRole('combobox', { name: 'Turma' })
		expect(document.activeElement).toBe(classroomField)
		expect(classroomField.getAttribute('aria-invalid')).toBe('true')
		expect(describedBy(classroomField)).toEqual(['Escolha a turma.'])
		expect(
			describedBy(
				screen.getByLabelText('Nome completo', { selector: CONTROLS }),
			),
		).toEqual(['Informe o nome completo.'])
		expect(createMock).not.toHaveBeenCalled()
	})

	it('acusa CPF inválido e não envia', async () => {
		const { screen } = await open('/criancas/nova')
		await screen.findByLabelText('CPF', { selector: CONTROLS })
		await fillRequired(screen)
		type(screen, 'CPF', '123.456.789-00')
		submit(screen)

		await waitFor(() =>
			expect(
				describedBy(screen.getByLabelText('CPF', { selector: CONTROLS })),
			).toEqual(['CPF inválido.']),
		)
		expect(document.activeElement).toBe(
			screen.getByLabelText('CPF', { selector: CONTROLS }),
		)
		// Sair do campo não apaga o erro.
		fireEvent.blur(screen.getByLabelText('CPF', { selector: CONTROLS }))
		expect(
			describedBy(screen.getByLabelText('CPF', { selector: CONTROLS })),
		).toEqual(['CPF inválido.'])
		expect(createMock).not.toHaveBeenCalled()
	})

	it('acusa data de nascimento no futuro (fuso de São Paulo)', async () => {
		vi.useFakeTimers({ toFake: ['Date'] })
		vi.setSystemTime(new Date('2026-11-01T23:30:00-03:00'))
		const { screen } = await open('/criancas/nova')
		await screen.findByLabelText('CPF', { selector: CONTROLS })
		await fillRequired(screen)
		type(screen, 'Data de nascimento', '2026-11-02')
		submit(screen)

		expect(
			await screen.findByText('A data de nascimento não pode ser no futuro.'),
		).toBeDefined()
		expect(createMock).not.toHaveBeenCalled()
	})

	it('envia sem espaços nas pontas, sem máscaras e sem opcionais vazios', async () => {
		createMock.mockResolvedValue({ ok: true, id: NEW_ID } as never)
		const { screen } = await open('/criancas/nova')
		await screen.findByLabelText('CPF', { selector: CONTROLS })
		await fillRequired(screen)
		type(screen, 'Nome completo', '  Ana Lima ')
		type(screen, 'CPF', '529.982.247-25')
		type(screen, 'CEP', '01310-100')
		type(screen, 'Complemento', '   ')
		submit(screen)

		await waitFor(() => expect(createMock).toHaveBeenCalled())
		expect(sent().data).toEqual({
			classroomId: turma1.id,
			name: 'Ana Lima',
			birthDate: '2022-03-15',
			cpf: '52998224725',
			cep: '01310100',
			address: 'Avenida Paulista',
			addressNumber: '1000',
			neighborhood: 'Bela Vista',
			city: 'São Paulo',
			state: 'SP',
		})
	})
})

describe('certidão de nascimento no formulário', () => {
	it('acusa matrícula com 31 números e não envia', async () => {
		const { screen } = await open('/criancas/nova')
		await screen.findByLabelText('CPF', { selector: CONTROLS })
		await fillRequired(screen)
		type(screen, 'Matrícula da certidão', '1045390155201310001202100001232')
		submit(screen)

		await waitFor(() =>
			expect(
				describedBy(
					screen.getByLabelText('Matrícula da certidão', {
						selector: CONTROLS,
					}),
				),
			).toContain('A matrícula tem 32 números.'),
		)
		expect(createMock).not.toHaveBeenCalled()
	})

	it('envia a matrícula de 32 números só com os dígitos', async () => {
		createMock.mockResolvedValue({ ok: true, id: NEW_ID } as never)
		const { screen } = await open('/criancas/nova')
		await screen.findByLabelText('CPF', { selector: CONTROLS })
		await fillRequired(screen)
		type(screen, 'Matrícula da certidão', '10453901552013100012021000012321')
		submit(screen)

		await waitFor(() => expect(createMock).toHaveBeenCalled())
		expect(sent().data.birthCertificateNumber).toBe(
			'10453901552013100012021000012321',
		)
	})

	it('não envia dado de certidão com a matrícula em branco', async () => {
		createMock.mockResolvedValue({ ok: true, id: NEW_ID } as never)
		const { screen } = await open('/criancas/nova')
		await screen.findByLabelText('CPF', { selector: CONTROLS })
		await fillRequired(screen)
		submit(screen)

		await waitFor(() => expect(createMock).toHaveBeenCalled())
		// Ausente no corpo serializado da server function.
		expect(JSON.parse(JSON.stringify(sent().data))).not.toHaveProperty(
			'birthCertificateNumber',
		)
	})
})

describe('erros da API no formulário de criança', () => {
	it('mostra o 409 de CPF no campo, mantém os dados e não busca nada de novo', async () => {
		createMock.mockResolvedValue({
			ok: false,
			kind: 'conflict',
			fieldErrors: { cpf: messages.childCpfTaken },
		} as never)
		const { screen, queryClient } = await open('/criancas/nova')
		await screen.findByLabelText('CPF', { selector: CONTROLS })
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
		await fillRequired(screen)
		type(screen, 'CPF', '52998224725')
		submit(screen)

		const cpf = screen.getByLabelText('CPF', {
			selector: CONTROLS,
		}) as HTMLInputElement
		await waitFor(() =>
			expect(describedBy(cpf)).toEqual([messages.childCpfTaken]),
		)
		expect(messages.childCpfTaken).toBe('Já existe uma criança com este CPF.')
		expect(cpf.value).toBe('529.982.247-25')
		expect(
			(
				screen.getByLabelText('Nome completo', {
					selector: CONTROLS,
				}) as HTMLInputElement
			).value,
		).toBe('Ana Lima')
		expect(invalidate).not.toHaveBeenCalled()
		expect(classroomsMock).toHaveBeenCalledTimes(1)
		expect(screen.queryByRole('alert')).toBeNull()

		// Editar o campo apaga o erro vindo da API.
		type(screen, 'CPF', '11144477735')
		expect(describedBy(cpf)).toEqual([])
	})

	it('mostra os 409 de RG e de matrícula nos campos', async () => {
		createMock.mockResolvedValue({
			ok: false,
			kind: 'conflict',
			fieldErrors: {
				rg: messages.childRgTaken,
				birthCertificateNumber: messages.childCertificateTaken,
			},
		} as never)
		const { screen } = await open('/criancas/nova')
		await screen.findByLabelText('CPF', { selector: CONTROLS })
		await fillRequired(screen)
		submit(screen)

		await waitFor(() =>
			expect(
				describedBy(screen.getByLabelText('RG', { selector: CONTROLS })),
			).toEqual(['Já existe uma criança com este RG.']),
		)
		expect(
			describedBy(
				screen.getByLabelText('Matrícula da certidão', { selector: CONTROLS }),
			),
		).toContain(messages.childCertificateTaken)
	})

	it('mostra o 400 de turma no campo "Turma"', async () => {
		createMock.mockResolvedValue({
			ok: false,
			kind: 'validation',
			fieldErrors: { classroomId: 'Turma não encontrada' },
		} as never)
		const { screen } = await open('/criancas/nova')
		await screen.findByLabelText('CPF', { selector: CONTROLS })
		await fillRequired(screen)
		submit(screen)

		await waitFor(() =>
			expect(
				describedBy(screen.getByRole('combobox', { name: 'Turma' })),
			).toEqual(['Turma não encontrada']),
		)
	})

	it('mostra o alerta de servidor indisponível no topo e mantém os campos', async () => {
		createMock.mockResolvedValue({
			ok: false,
			kind: 'unavailable',
			message: messages.unavailable,
			fieldErrors: {},
		} as never)
		const { screen } = await open('/criancas/nova')
		await screen.findByLabelText('CPF', { selector: CONTROLS })
		await fillRequired(screen)
		submit(screen)

		expect((await screen.findByRole('alert')).textContent).toContain(
			'Não foi possível falar com o servidor. Tente de novo em instantes.',
		)
		expect(
			(
				screen.getByLabelText('Nome completo', {
					selector: CONTROLS,
				}) as HTMLInputElement
			).value,
		).toBe('Ana Lima')
	})

	it('desabilita "Salvar alterações" durante o envio', async () => {
		const pending = deferred<unknown>()
		updateMock.mockReturnValue(pending.promise as never)
		const { screen } = await open(`/criancas/${CHILD_ID}/editar`)
		const button = await screen.findByRole('button', {
			name: 'Salvar alterações',
		})
		submit(screen, 'Salvar alterações')

		await waitFor(() => expect(button).toHaveProperty('disabled', true))
		pending.resolve({ ok: true, id: CHILD_ID })
		expect(await screen.findByText('Detalhes da criança')).toBeDefined()
	})
})

describe('cadastrar criança', () => {
	it('vai aos detalhes com o aviso e invalida crianças e turmas', async () => {
		createMock.mockResolvedValue({ ok: true, id: NEW_ID } as never)
		const { screen, router, queryClient } = await open('/criancas/nova')
		await screen.findByLabelText('CPF', { selector: CONTROLS })
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
		await fillRequired(screen)
		submit(screen)

		expect(await screen.findByText('Detalhes da criança')).toBeDefined()
		expect(router.state.location.pathname).toBe(`/criancas/${NEW_ID}`)
		expect(await screen.findByText('Criança cadastrada.')).toBeDefined()
		expect(screen.queryByText('Sair sem salvar?')).toBeNull()
		expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.children })
		expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.classrooms })
	})

	it('sem turmas, um COORDENADOR vê o aviso com "Ir para Turmas"', async () => {
		const { screen } = await open('/criancas/nova', { classrooms: [] })

		expect(await screen.findByText('Cadastre uma turma antes.')).toBeDefined()
		expect(
			screen.getByRole('link', { name: 'Ir para Turmas' }).getAttribute('href'),
		).toBe('/configuracoes/turmas')
		expect(screen.queryByRole('combobox', { name: 'Turma' })).toBeNull()
		expect(
			screen.getByRole('button', { name: 'Cadastrar criança' }),
		).toHaveProperty('disabled', true)
	})

	it('sem turmas, uma EDUCADOR vê o aviso sem o link', async () => {
		const { screen } = await open('/criancas/nova', {
			classrooms: [],
			role: 'EDUCADOR',
		})

		expect(await screen.findByText('Cadastre uma turma antes.')).toBeDefined()
		expect(
			screen.getByText('Peça a um(a) coordenador(a) para cadastrar uma turma.'),
		).toBeDefined()
		expect(screen.queryByRole('link', { name: 'Ir para Turmas' })).toBeNull()
		expect(
			screen.getByRole('button', { name: 'Cadastrar criança' }),
		).toHaveProperty('disabled', true)
	})
})

describe('editar criança e trocar de turma', () => {
	it('abre preenchida, com a turma atual, a matrícula e o nome no subtítulo', async () => {
		const { screen } = await open(`/criancas/${CHILD_ID}/editar`)

		expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(
			'Editar criança',
		)
		expect(screen.getByText('Ana Lima', { selector: 'p' })).toBeDefined()
		expect(screen.getByRole('combobox', { name: 'Turma' }).textContent).toBe(
			'Turma 1',
		)
		expect(
			(
				screen.getByLabelText('Nome completo', {
					selector: CONTROLS,
				}) as HTMLInputElement
			).value,
		).toBe('Ana Lima')
		expect(
			(screen.getByLabelText('CPF', { selector: CONTROLS }) as HTMLInputElement)
				.value,
		).toBe('529.982.247-25')
		expect(
			(
				screen.getByLabelText('Matrícula da certidão', {
					selector: CONTROLS,
				}) as HTMLInputElement
			).value,
		).toBe('104539 01 55 2013 1 00012 021 0000123 21')
		expect(
			screen.getByRole('button', { name: 'Salvar alterações' }),
		).toBeDefined()
		expect(
			screen.getByRole('link', { name: 'Cancelar' }).getAttribute('href'),
		).toBe(`/criancas/${CHILD_ID}`)
		expect(await headTitle(EditChildRoute, { status: 'success' })).toEqual({
			title: 'Editar criança · Educare',
		})
	})

	it('avisa da troca de turma e esconde o aviso ao voltar à atual', async () => {
		updateMock.mockResolvedValue({ ok: true, id: CHILD_ID } as never)
		const { screen, router } = await open(`/criancas/${CHILD_ID}/editar`)
		await screen.findByRole('combobox', { name: 'Turma' })
		const warning =
			'A criança sai da Turma 1 hoje e entra na Turma 2. A mudança fica no histórico.'

		await choose(screen, 'Turma', 'Turma 2')
		expect(
			describedBy(screen.getByRole('combobox', { name: 'Turma' })),
		).toEqual([warning])

		await choose(screen, 'Turma', 'Turma 1')
		expect(screen.queryByText(warning)).toBeNull()

		await choose(screen, 'Turma', 'Turma 2')
		submit(screen, 'Salvar alterações')

		expect(await screen.findByText('Detalhes da criança')).toBeDefined()
		expect(router.state.location.pathname).toBe(`/criancas/${CHILD_ID}`)
		expect(await screen.findByText('Dados da criança salvos.')).toBeDefined()
		expect(updateMock).toHaveBeenCalledWith({
			data: expect.objectContaining({
				id: CHILD_ID,
				classroomId: turma2.id,
				cpf: '52998224725',
				birthCertificateNumber: '10453901552013100012021000012321',
			}),
		})
	})

	it('não chama getChild ao abrir a edição com a criança fresca no cache', async () => {
		const { screen, router, queryClient } = await open(`/criancas/${CHILD_ID}`)
		await screen.findByText('Detalhes da criança')
		queryClient.setQueryData(keys.child(CHILD_ID), ana)

		await router.navigate({
			to: '/criancas/$childId/editar',
			params: { childId: CHILD_ID },
		})

		expect(
			(
				(await screen.findByLabelText('Nome completo', {
					selector: CONTROLS,
				})) as HTMLInputElement
			).value,
		).toBe('Ana Lima')
		expect(getChildMock).not.toHaveBeenCalled()
	})

	it('mostra "Criança não encontrada" sem o formulário para um id inexistente', async () => {
		const { screen, router } = await open(`/criancas/${NEW_ID}/editar`, {
			child: null,
		})

		expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(
			'Criança não encontrada',
		)
		expect(
			screen.getByText('Ela pode ter sido excluída ou o endereço está errado.'),
		).toBeDefined()
		expect(
			screen
				.getByRole('link', { name: 'Voltar para Crianças' })
				.getAttribute('href'),
		).toBe('/criancas')
		expect(
			screen.queryByRole('button', { name: 'Salvar alterações' }),
		).toBeNull()
		const match = router.state.matches.find(
			(item) => item.routeId === EditChildRoute.id,
		)
		expect(await headTitle(EditChildRoute, match)).toEqual({
			title: 'Criança não encontrada · Educare',
		})
	})

	it('trata um id que não é UUID como não encontrado, sem chamar a API', async () => {
		const { screen } = await open('/criancas/abc/editar')

		expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(
			'Criança não encontrada',
		)
		expect(getChildMock).not.toHaveBeenCalled()
	})

	it('mostra o erro ao buscar a criança com "Tentar de novo"', async () => {
		const { screen } = await open(`/criancas/${CHILD_ID}/editar`, {
			childResult: { ok: false, message: messages.unavailable },
		})

		expect(await screen.findByText(messages.unavailable)).toBeDefined()
		getChildMock.mockResolvedValue({ ok: true, child: ana } as never)
		fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
		expect(
			(
				(await screen.findByLabelText('Nome completo', {
					selector: CONTROLS,
				})) as HTMLInputElement
			).value,
		).toBe('Ana Lima')
	})
})

describe('sair do formulário com alterações não salvas', () => {
	it('"Cancelar" com alterações pergunta; "Continuar editando" fica e "Sair sem salvar" sai', async () => {
		const { screen, router } = await open('/criancas/nova')
		await screen.findByLabelText('Nome completo', { selector: CONTROLS })
		type(screen, 'Nome completo', 'Ana')

		fireEvent.click(screen.getByRole('link', { name: 'Cancelar' }))
		let dialog = within(
			await screen.findByRole('dialog', { name: 'Sair sem salvar?' }),
		)
		expect(
			dialog.getByText('As alterações feitas neste formulário serão perdidas.'),
		).toBeDefined()
		fireEvent.click(dialog.getByRole('button', { name: 'Continuar editando' }))
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
		expect(router.state.location.pathname).toBe('/criancas/nova')
		expect(
			(
				screen.getByLabelText('Nome completo', {
					selector: CONTROLS,
				}) as HTMLInputElement
			).value,
		).toBe('Ana')

		fireEvent.click(screen.getByRole('link', { name: 'Cancelar' }))
		dialog = within(
			await screen.findByRole('dialog', { name: 'Sair sem salvar?' }),
		)
		fireEvent.click(dialog.getByRole('button', { name: 'Sair sem salvar' }))
		expect(await screen.findByText('Página de crianças')).toBeDefined()
	})

	it('pergunta antes de sair pela barra lateral', async () => {
		const { screen, router } = await open(`/criancas/${CHILD_ID}/editar`)
		await screen.findByLabelText('Endereço', { selector: CONTROLS })
		type(screen, 'Endereço', 'Rua Nova')

		fireEvent.click(screen.getByRole('link', { name: 'Turmas' }))
		expect(
			await screen.findByRole('dialog', { name: 'Sair sem salvar?' }),
		).toBeDefined()
		expect(router.state.location.pathname).toBe(`/criancas/${CHILD_ID}/editar`)
	})

	it('sem alterações, sai sem perguntar', async () => {
		const { screen } = await open('/criancas/nova')
		await screen.findByLabelText('Nome completo', { selector: CONTROLS })

		fireEvent.click(screen.getByRole('link', { name: 'Cancelar' }))
		expect(await screen.findByText('Página de crianças')).toBeDefined()
		expect(screen.queryByText('Sair sem salvar?')).toBeNull()
	})
})
