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
import type {
	Child,
	ChildClassroomPeriod,
} from '#/integrations/educare-api/children'
import {
	deleteChild,
	getChild,
	getChildClassrooms,
	getClassrooms,
	getCurrentUser,
} from '#/integrations/educare-api/functions'
import { messages } from '#/integrations/educare-api/messages'
import { keys } from '#/integrations/educare-api/queries'
import { attach, renderRoutes } from '#/testing/render-route'
import { Route as AuthenticatedRoute } from './_authenticated'
import { Route as EditChildRoute } from './_authenticated/criancas/$childId/editar'
import { Route as ChildRoute } from './_authenticated/criancas/$childId/index'

vi.mock('#/integrations/educare-api/functions', () => ({
	login: vi.fn(),
	logout: vi.fn(),
	getCurrentUser: vi.fn(),
	getChild: vi.fn(),
	getChildClassrooms: vi.fn(),
	deleteChild: vi.fn(),
	createChild: vi.fn(),
	updateChild: vi.fn(),
	getChildren: vi.fn(),
	getClassrooms: vi.fn(),
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
const childMock = vi.mocked(getChild)
const historyMock = vi.mocked(getChildClassrooms)
const deleteMock = vi.mocked(deleteChild)

const id = '7f1d2c3b-4a5e-4f60-8a71-9b8c7d6e5f40'

const coordinator = {
	id: '2',
	name: 'Administrador',
	login: 'admin@educare.org',
	role: 'COORDENADOR',
	createdAt: '2026-01-10T12:00:00Z',
}
const educator = { ...coordinator, id: '3', role: 'EDUCADOR' }

const required: Child = {
	id,
	name: 'Ana Lima',
	birthDate: '2022-03-10',
	classroom: { id: 'turma-2', name: 'Turma 2' },
	cep: '01310100',
	address: 'Avenida Paulista',
	addressNumber: '1000',
	neighborhood: 'Bela Vista',
	city: 'São Paulo',
	state: 'SP',
	createdAt: '2026-10-01T12:00:00Z',
	updatedAt: '2026-11-01T12:00:00Z',
}

const complete: Child = {
	...required,
	birthplace: 'Recife',
	nationality: 'Brasileira',
	gender: 'FEMALE',
	race: 'BROWN',
	maritalStatus: 'SINGLE',
	cpf: '52998224725',
	rg: '1234568X',
	birthCertificateNumber: '10453901552022100012345612345672',
	addressComplement: 'Apto 12',
	religion: 'Católica',
	church: 'Paróquia São José',
	healthReport: 'TEA',
	medication: 'Nenhuma contínua',
	medicalObservation: 'Alergia a amendoim',
}

const periods: ChildClassroomPeriod[] = [
	{
		classroomId: 'turma-2',
		classroomName: 'Turma 2',
		startDate: '2026-11-01',
		endDate: null,
	},
	{
		classroomId: 'turma-1',
		classroomName: 'Turma 1',
		startDate: '2026-10-01',
		endDate: '2026-11-01',
	},
]

async function open({
	user = coordinator,
	child = complete as Child | null,
	history = periods,
	url = `/criancas/${id}`,
	childResult = { ok: true, child } as unknown,
	historyResult = { ok: true, periods: history } as unknown,
} = {}) {
	sessionMock.mockResolvedValue({ user, expired: false } as never)
	// Um resultado com erro se repete: o `useQuery` tenta de novo ao montar.
	childMock.mockResolvedValue(childResult as never)
	historyMock.mockResolvedValue(historyResult as never)
	render(<Toaster />)
	return renderRoutes(url, (root) => {
		const layout = attach(AuthenticatedRoute, root, { id: '/_authenticated' })
		return [
			layout.addChildren([
				attach(ChildRoute, layout, {
					id: '/criancas/$childId/',
					path: '/criancas/$childId',
				}),
				attach(EditChildRoute, layout, {
					id: '/criancas/$childId/editar',
					path: '/criancas/$childId/editar',
				}),
			]),
		]
	})
}

type Rendered = Awaited<ReturnType<typeof open>>

function region(screen: Rendered['screen'], name: string) {
	return within(screen.getByRole('region', { name }))
}

/** Pares rótulo → valor de um cartão. */
function fields(screen: Rendered['screen'], name: string) {
	const card = screen.getByRole('region', { name })
	return Object.fromEntries(
		Array.from(card.querySelectorAll('dt')).map((term) => [
			term.textContent,
			term.nextElementSibling?.textContent,
		]),
	)
}

async function title(router: Rendered['router']) {
	const match = router.state.matches.at(-1)
	const head = await ChildRoute.options.head?.({
		match,
		matches: router.state.matches,
	} as never)
	return head?.meta
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date('2026-11-01T15:00:00Z'))
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	)
})

afterEach(() => {
	toast.dismiss()
	cleanup()
	vi.clearAllMocks()
	vi.unstubAllGlobals()
	vi.useRealTimers()
})

describe('detalhes da criança', () => {
	it('mostra o cabeçalho e todos os cartões preenchidos', async () => {
		const { screen } = await open()

		expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(
			'Ana Lima',
		)
		expect(screen.getByText('4 anos · 10/03/2022')).toBeDefined()
		expect(screen.getByText('AL')).toBeDefined()
		expect(
			screen
				.getByRole('link', { name: 'Voltar para Crianças' })
				.getAttribute('href'),
		).toBe('/criancas')

		expect(fields(screen, 'Dados pessoais')).toEqual({
			'Nome completo': 'Ana Lima',
			'Data de nascimento': '10/03/2022',
			Naturalidade: 'Recife',
			Nacionalidade: 'Brasileira',
			Gênero: 'Feminino',
			'Raça/cor': 'Parda',
			'Estado civil': 'Solteiro(a)',
		})
		expect(fields(screen, 'Endereço')).toEqual({
			CEP: '01310-100',
			Endereço: 'Avenida Paulista',
			Número: '1000',
			Complemento: 'Apto 12',
			Bairro: 'Bela Vista',
			Cidade: 'São Paulo',
			UF: 'SP',
		})
		expect(fields(screen, 'Religião')).toEqual({
			Religião: 'Católica',
			Igreja: 'Paróquia São José',
		})
		expect(fields(screen, 'Saúde')).toEqual({
			Laudo: 'TEA',
			Medicação: 'Nenhuma contínua',
			'Observação médica': 'Alergia a amendoim',
		})
		expect(
			region(screen, 'Documentos').getByText('529.***.***-25'),
		).toBeDefined()
		expect(
			await region(screen, 'Histórico de turmas').findByText(
				'Turma 2 · desde 01/11/2026',
			),
		).toBeDefined()
	})

	it('mostra "Não informado" nos opcionais vazios', async () => {
		const { screen } = await open({ child: required })
		await screen.findByRole('heading', { level: 1 })

		const personal = fields(screen, 'Dados pessoais')
		for (const term of [
			'Naturalidade',
			'Nacionalidade',
			'Gênero',
			'Raça/cor',
			'Estado civil',
		]) {
			expect(personal[term]).toBe('Não informado')
		}
		expect(fields(screen, 'Documentos')).toEqual({
			CPF: 'Não informado',
			RG: 'Não informado',
			'Matrícula da certidão': 'Não informado',
		})
		expect(fields(screen, 'Endereço').Complemento).toBe('Não informado')
		expect(fields(screen, 'Religião')).toEqual({
			Religião: 'Não informado',
			Igreja: 'Não informado',
		})
		expect(fields(screen, 'Saúde')).toEqual({
			Laudo: 'Não informado',
			Medicação: 'Não informado',
			'Observação médica': 'Não informado',
		})
		expect(screen.queryByRole('button', { name: /^Mostrar/ })).toBeNull()
	})

	it('mostra "Editar" e "Excluir" para COORDENADOR', async () => {
		const { screen } = await open()
		const edit = await screen.findByRole('link', { name: 'Editar' })
		expect(edit.getAttribute('href')).toBe(`/criancas/${id}/editar`)
		expect(screen.getByRole('button', { name: 'Excluir' })).toBeDefined()
	})

	it('abre a edição preenchida sem buscar a criança de novo', async () => {
		vi.mocked(getClassrooms).mockResolvedValue({
			ok: true,
			classrooms: [
				{
					id: 'turma-2',
					name: 'Turma 2',
					studentCount: 1,
					maleCount: 0,
					femaleCount: 1,
					createdAt: '2026-02-02T13:00:00Z',
				},
			],
		} as never)
		const { screen, router } = await open()
		fireEvent.click(await screen.findByRole('link', { name: 'Editar' }))

		expect(
			await screen.findByRole('heading', { level: 1, name: 'Editar criança' }),
		).toBeDefined()
		expect(router.state.location.pathname).toBe(`/criancas/${id}/editar`)
		expect(childMock).toHaveBeenCalledTimes(1)
	})

	it('mostra "Editar" e não mostra "Excluir" para EDUCADOR', async () => {
		const { screen } = await open({ user: educator })
		expect(await screen.findByRole('link', { name: 'Editar' })).toBeDefined()
		expect(screen.queryByRole('button', { name: 'Excluir' })).toBeNull()
	})

	it('mostra o erro com "Tentar de novo" quando a criança não pode ser buscada', async () => {
		const { screen } = await open({
			childResult: { ok: false, message: messages.unavailable },
		})
		expect(await screen.findByText(messages.unavailable)).toBeDefined()
		expect(screen.queryByRole('heading', { level: 1 })).toBeNull()

		childMock.mockResolvedValue({ ok: true, child: complete } as never)
		fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
		expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(
			'Ana Lima',
		)
	})
})

describe('título da aba', () => {
	it('é "Criança · Educare", sem o nome', async () => {
		const { screen, router } = await open()
		await screen.findByRole('heading', { level: 1 })
		const meta = await title(router)
		expect(meta).toEqual([{ title: 'Criança · Educare' }])
		expect(JSON.stringify(meta)).not.toContain('Ana')
	})
})

describe('documentos mascarados', () => {
	it('mostra e oculta o CPF sem nova chamada à API', async () => {
		const { screen } = await open()
		await screen.findByRole('heading', { level: 1 })
		const docs = region(screen, 'Documentos')
		expect(docs.getByText('529.***.***-25')).toBeDefined()

		fireEvent.click(docs.getByRole('button', { name: 'Mostrar CPF' }))
		expect(docs.getByText('529.982.247-25')).toBeDefined()
		const hide = docs.getByRole('button', { name: 'Ocultar CPF' })
		expect(hide.textContent).toBe('Ocultar')

		fireEvent.click(hide)
		expect(docs.getByText('529.***.***-25')).toBeDefined()
		expect(childMock).toHaveBeenCalledTimes(1)
	})

	it('mostra o RG só com os 2 últimos caracteres', async () => {
		const { screen } = await open()
		await screen.findByRole('heading', { level: 1 })
		const docs = region(screen, 'Documentos')
		expect(docs.getByText('******8X')).toBeDefined()
		fireEvent.click(docs.getByRole('button', { name: 'Mostrar RG' }))
		expect(docs.getByText('1234568X')).toBeDefined()
	})

	it('mostra a matrícula com os 15 primeiros e os 2 últimos números', async () => {
		const { screen } = await open()
		await screen.findByRole('heading', { level: 1 })
		const docs = region(screen, 'Documentos')
		expect(
			docs.getByText('104539 01 55 2022 1 ••••• ••• ••••••• 72'),
		).toBeDefined()

		fireEvent.click(docs.getByRole('button', { name: 'Mostrar matrícula' }))
		expect(
			docs.getByText('104539 01 55 2022 1 00012 345 6123456 72'),
		).toBeDefined()
		expect(childMock).toHaveBeenCalledTimes(1)
		expect(historyMock).toHaveBeenCalledTimes(1)
	})

	it('volta a mascarar ao sair e voltar à página', async () => {
		const { screen, router } = await open()
		await screen.findByRole('heading', { level: 1 })
		fireEvent.click(
			region(screen, 'Documentos').getByRole('button', { name: 'Mostrar CPF' }),
		)
		await router.navigate({ to: '/criancas' })
		await screen.findByText('Página de crianças')
		await router.navigate({
			to: '/criancas/$childId',
			params: { childId: id },
		})
		expect(
			await region(screen, 'Documentos').findByText('529.***.***-25'),
		).toBeDefined()
	})
})

describe('histórico de turmas', () => {
	it('mostra a turma atual e as anteriores, da mais recente para a mais antiga', async () => {
		const { screen } = await open()
		const history = region(screen, 'Histórico de turmas')
		const items = await history.findAllByRole('listitem')
		expect(items.map((item) => item.textContent)).toEqual([
			'Turma 2 · desde 01/11/2026',
			'Turma 1 · 01/10/2026 – 01/11/2026',
		])
	})

	it('mostra só a turma atual quando nunca trocou', async () => {
		const { screen } = await open({
			child: { ...complete, classroom: { id: 'turma-1', name: 'Turma 1' } },
			history: [
				{
					classroomId: 'turma-1',
					classroomName: 'Turma 1',
					startDate: '2026-10-01',
					endDate: null,
				},
			],
		})
		const items = await region(screen, 'Histórico de turmas').findAllByRole(
			'listitem',
		)
		expect(items.map((item) => item.textContent)).toEqual([
			'Turma 1 · desde 01/10/2026',
		])
	})

	it('mostra o erro só no cartão, com "Tentar de novo"', async () => {
		const { screen } = await open({
			historyResult: { ok: false, message: messages.unavailable },
		})
		const history = region(screen, 'Histórico de turmas')
		expect(await history.findByText(messages.unavailable)).toBeDefined()
		expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
			'Ana Lima',
		)

		historyMock.mockResolvedValue({ ok: true, periods } as never)
		fireEvent.click(history.getByRole('button', { name: 'Tentar de novo' }))
		expect(await history.findByText('Turma 2 · desde 01/11/2026')).toBeDefined()
	})
})

describe('criança não encontrada', () => {
	it('mostra a página de não encontrada quando a API responde 404', async () => {
		const { screen, router } = await open({ child: null })
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
		expect(await title(router)).toEqual([
			{ title: 'Criança não encontrada · Educare' },
		])
	})

	it('não chama a API quando o id não é válido', async () => {
		const { screen } = await open({ url: '/criancas/123' })
		expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(
			'Criança não encontrada',
		)
		expect(childMock).not.toHaveBeenCalled()
		expect(historyMock).not.toHaveBeenCalled()
	})

	it('volta à lista pelo link', async () => {
		const { screen, router } = await open({ child: null })
		fireEvent.click(
			await screen.findByRole('link', { name: 'Voltar para Crianças' }),
		)
		expect(await screen.findByText('Página de crianças')).toBeDefined()
		expect(router.state.location.pathname).toBe('/criancas')
	})
})

/** Abre o modal de exclusão pelo botão "Excluir". */
async function openDelete(screen: Rendered['screen']) {
	const trigger = await screen.findByRole('button', { name: 'Excluir' })
	fireEvent.click(trigger)
	const dialog = await screen.findByRole('dialog', {
		name: 'Excluir Ana Lima?',
	})
	return { trigger, dialog: within(dialog), element: dialog }
}

/** Registra se "Criança não encontrada" chegou a aparecer na tela. */
function watchNotFound() {
	let seen = false
	const check = () => {
		if (document.body.textContent?.includes('Criança não encontrada')) {
			seen = true
		}
	}
	const observer = new MutationObserver(check)
	observer.observe(document.body, {
		childList: true,
		subtree: true,
		characterData: true,
	})
	return {
		seen: () => {
			check()
			observer.disconnect()
			return seen
		},
	}
}

describe('excluir criança', () => {
	it('abre o modal com os textos e o foco em "Cancelar"', async () => {
		const { screen } = await open()
		const { dialog } = await openDelete(screen)
		expect(
			dialog.getByText(
				'Os dados e o histórico de turmas da criança serão apagados.',
			),
		).toBeDefined()
		expect(dialog.getByText('Essa ação não pode ser desfeita.')).toBeDefined()
		expect(document.activeElement).toBe(
			dialog.getByRole('button', { name: 'Cancelar' }),
		)
		expect(
			dialog.getByRole('button', { name: 'Excluir criança' }),
		).toBeDefined()
		expect(deleteMock).not.toHaveBeenCalled()
	})

	it('fecha com "Cancelar", sem excluir, e devolve o foco ao "Excluir"', async () => {
		const { screen } = await open()
		const { dialog, trigger } = await openDelete(screen)
		fireEvent.click(dialog.getByRole('button', { name: 'Cancelar' }))

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
		expect(deleteMock).not.toHaveBeenCalled()
		await waitFor(() => expect(document.activeElement).toBe(trigger))
	})

	it('fecha com Esc', async () => {
		const { screen } = await open()
		const { element } = await openDelete(screen)
		fireEvent.keyDown(element, { key: 'Escape' })
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
		expect(deleteMock).not.toHaveBeenCalled()
	})

	it('exclui, vai para /criancas com o aviso e tira a criança do cache, sem piscar "não encontrada"', async () => {
		const { screen, router, queryClient } = await open()
		await screen.findByRole('heading', { level: 1 })
		queryClient.setQueryData(keys.childList({ pagina: 1 }), {
			children: [],
			page: { number: 0, size: 20, totalElements: 0, totalPages: 0 },
		})
		// Depois de excluída, a API responderia 404 a uma nova busca.
		childMock.mockResolvedValue({ ok: true, child: null } as never)
		deleteMock.mockResolvedValue({ ok: true } as never)
		const { dialog } = await openDelete(screen)
		const notFound = watchNotFound()

		fireEvent.click(dialog.getByRole('button', { name: 'Excluir criança' }))

		expect(await screen.findByText('Página de crianças')).toBeDefined()
		expect(router.state.location.pathname).toBe('/criancas')
		expect(await screen.findByText(messages.childDeleted)).toBeDefined()
		expect(deleteMock).toHaveBeenCalledWith({ data: { id } })
		expect(notFound.seen()).toBe(false)
		expect(childMock).toHaveBeenCalledTimes(1)
		expect(historyMock).toHaveBeenCalledTimes(1)
		expect(queryClient.getQueryState(keys.child(id))).toBeUndefined()
		expect(queryClient.getQueryState(keys.childClassrooms(id))).toBeUndefined()
		expect(
			queryClient.getQueryState(keys.childList({ pagina: 1 }))?.isInvalidated,
		).toBe(true)
	})

	it('volta pelo navegador aos detalhes da criança excluída e mostra "não encontrada"', async () => {
		const { screen, router } = await open()
		await screen.findByRole('heading', { level: 1 })
		childMock.mockResolvedValue({ ok: true, child: null } as never)
		deleteMock.mockResolvedValue({ ok: true } as never)
		const { dialog } = await openDelete(screen)
		fireEvent.click(dialog.getByRole('button', { name: 'Excluir criança' }))
		await screen.findByText('Página de crianças')

		router.history.back()
		expect(
			await screen.findByRole('heading', {
				level: 1,
				name: 'Criança não encontrada',
			}),
		).toBeDefined()
		expect(screen.queryByText('Ana Lima')).toBeNull()
	})

	it('com 404 vai para /criancas com "Essa criança não existe mais."', async () => {
		const { screen, router } = await open()
		deleteMock.mockResolvedValue({ ok: true, notFound: true } as never)
		const notFound = watchNotFound()
		const { dialog } = await openDelete(screen)
		fireEvent.click(dialog.getByRole('button', { name: 'Excluir criança' }))

		expect(await screen.findByText('Página de crianças')).toBeDefined()
		expect(router.state.location.pathname).toBe('/criancas')
		expect(await screen.findByText(messages.childNotFound)).toBeDefined()
		expect(notFound.seen()).toBe(false)
		expect(childMock).toHaveBeenCalledTimes(1)
	})

	it.each([
		['500', 'unavailable', messages.unavailable],
		['403', 'forbidden', messages.forbidden],
	])('com %s mostra o erro no modal e não atualiza nada', async (_status, kind, message) => {
		const { screen, router, queryClient } = await open()
		await screen.findByRole('heading', { level: 1 })
		deleteMock.mockResolvedValue({
			ok: false,
			kind,
			message,
			fieldErrors: {},
		} as never)
		const { dialog } = await openDelete(screen)
		fireEvent.click(dialog.getByRole('button', { name: 'Excluir criança' }))

		expect(await dialog.findByText(message)).toBeDefined()
		expect(screen.getByRole('dialog')).toBeDefined()
		expect(router.state.location.pathname).toBe(`/criancas/${id}`)
		expect(queryClient.getQueryState(keys.child(id))?.isInvalidated).toBe(false)
		expect(childMock).toHaveBeenCalledTimes(1)
		expect(historyMock).toHaveBeenCalledTimes(1)
		expect(
			dialog.getByRole('button', { name: 'Excluir criança' }),
		).toHaveProperty('disabled', false)
	})

	it('durante o envio desabilita os botões e não fecha por Esc', async () => {
		const { screen } = await open()
		let resolve: (value: unknown) => void = () => {}
		deleteMock.mockReturnValue(
			new Promise((done) => {
				resolve = done
			}) as never,
		)
		const { dialog, element } = await openDelete(screen)
		fireEvent.click(dialog.getByRole('button', { name: 'Excluir criança' }))

		await waitFor(() =>
			expect(
				dialog.getByRole('button', { name: 'Excluir criança' }),
			).toHaveProperty('disabled', true),
		)
		expect(dialog.getByRole('button', { name: 'Cancelar' })).toHaveProperty(
			'disabled',
			true,
		)
		fireEvent.keyDown(element, { key: 'Escape' })
		expect(screen.getByRole('dialog')).toBeDefined()

		resolve({ ok: true })
		expect(await screen.findByText('Página de crianças')).toBeDefined()
	})
})
