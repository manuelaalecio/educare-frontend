import { createRoute } from '@tanstack/react-router'
import {
	act,
	cleanup,
	fireEvent,
	waitFor,
	within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
	ChildrenFilters,
	ChildSummary,
} from '#/integrations/educare-api/children'
import {
	getChildren,
	getClassrooms,
	getCurrentUser,
} from '#/integrations/educare-api/functions'
import { messages } from '#/integrations/educare-api/messages'
import { keys } from '#/integrations/educare-api/queries'
import { attach, renderRoutes } from '#/testing/render-route'
import { Route as AuthenticatedRoute } from './_authenticated'
import { Route as ChildrenRoute } from './_authenticated/criancas/index'

vi.mock('#/integrations/educare-api/functions', () => ({
	login: vi.fn(),
	logout: vi.fn(),
	getCurrentUser: vi.fn(),
	changeOwnPassword: vi.fn(),
	getClassrooms: vi.fn(),
	createClassroom: vi.fn(),
	renameClassroom: vi.fn(),
	deleteClassroom: vi.fn(),
	getUsers: vi.fn(),
	createUser: vi.fn(),
	updateUser: vi.fn(),
	resetUserPassword: vi.fn(),
	deleteUser: vi.fn(),
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

const sessionMock = vi.mocked(getCurrentUser)
const listMock = vi.mocked(getChildren)
const classroomsMock = vi.mocked(getClassrooms)

const PAGE_SIZE = 20
const TODAY = new Date('2026-11-01T15:00:00Z')

const turma1 = { id: '11111111-1111-4111-8111-111111111111', name: 'Turma 1' }
const turma2 = { id: '22222222-2222-4222-8222-222222222222', name: 'Turma 2' }

let nextId = 0
function child(
	name: string,
	birthDate = '2022-03-10',
	classroom = turma1,
): ChildSummary {
	nextId += 1
	const id = `00000000-0000-4000-8000-${String(nextId).padStart(12, '0')}`
	return { id, name, birthDate, classroom }
}

/** Crianças "na API": a lista é filtrada e paginada a partir daqui, por nome. */
let db: ChildSummary[] = []

const normalize = (text: string) =>
	text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()

/** A página pedida das crianças de `db`, como a API. */
function listing({ nome, turma, pagina }: ChildrenFilters) {
	const found = db
		.filter((item) => !nome || normalize(item.name).includes(normalize(nome)))
		.filter((item) => !turma || item.classroom.id === turma)
		.sort((a, b) => a.name.localeCompare(b.name))
	const number = pagina - 1
	return {
		ok: true as const,
		children: found.slice(number * PAGE_SIZE, (number + 1) * PAGE_SIZE),
		page: {
			number,
			size: PAGE_SIZE,
			totalElements: found.length,
			totalPages: Math.ceil(found.length / PAGE_SIZE),
		},
	}
}

function serveList() {
	listMock.mockImplementation((async ({ data }: { data: ChildrenFilters }) =>
		listing(data)) as never)
}

function session(role: 'COORDENADOR' | 'EDUCADOR') {
	sessionMock.mockResolvedValue({
		user: {
			id: 'me',
			name: 'Maria Souza',
			login: 'maria@educare.org',
			role,
			createdAt: '2026-01-01T00:00:00Z',
			updatedAt: '2026-01-01T00:00:00Z',
		},
		expired: false,
	} as never)
}

function mount(url: string) {
	return renderRoutes(url, (root) => {
		const layout = attach(AuthenticatedRoute, root, { id: '/_authenticated' })
		const details = createRoute({
			getParentRoute: () => layout,
			path: '/criancas/$childId',
			component: () => <p>Página de detalhes</p>,
		})
		return [
			layout.addChildren([
				attach(ChildrenRoute, layout, { id: '/criancas/', path: '/criancas' }),
				details,
			]),
		]
	})
}

async function open(
	url = '/criancas',
	children = db,
	role: 'COORDENADOR' | 'EDUCADOR' = 'EDUCADOR',
) {
	db = [...children]
	serveList()
	session(role)
	return mount(url)
}

type Screen = Awaited<ReturnType<typeof open>>['screen']
type Router = Awaited<ReturnType<typeof open>>['router']

async function table(screen: Screen) {
	return within(await screen.findByRole('table', { name: 'Crianças' }))
}

/** Nomes nas linhas da tabela, na ordem. */
async function rowNames(screen: Screen) {
	const rows = (await table(screen)).getAllByRole('row').slice(1)
	return rows.map(
		(row) => within(row).getAllByRole('cell')[0].textContent ?? '',
	)
}

function url(router: Router) {
	return router.state.location.href
}

async function chooseClassroom(screen: Screen, label: string) {
	fireEvent.keyDown(screen.getByRole('combobox', { name: 'Turma' }), {
		key: 'ArrowDown',
	})
	fireEvent.click(await screen.findByRole('option', { name: label }))
}

function searchBox(screen: Screen) {
	return screen.getByRole('searchbox', { name: 'Buscar por nome' })
}

const calledWith = (filters: Partial<ChildrenFilters>) =>
	listMock.mock.calls.filter(([arg]) => {
		const data = (arg as { data: ChildrenFilters }).data
		return Object.entries(filters).every(
			([key, value]) => data[key as keyof ChildrenFilters] === value,
		)
	})

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'], now: TODAY, shouldAdvanceTime: true })
	nextId = 0
	db = []
	classroomsMock.mockResolvedValue({
		ok: true,
		classrooms: [turma2, turma1].map((classroom) => ({
			...classroom,
			studentCount: 0,
			maleCount: 0,
			femaleCount: 0,
			createdAt: '2026-01-01T00:00:00Z',
		})),
	} as never)
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
	cleanup()
	vi.useRealTimers()
	vi.clearAllMocks()
	vi.unstubAllGlobals()
})

describe('lista de crianças', () => {
	it('mostra a tabela no desktop com idade, nascimento e turma', async () => {
		const ana = child('Ana Lima', '2022-03-10', turma1)
		const bruno = child('Bruno Reis', '2026-02-10', turma2)
		const { screen } = await open('/criancas', [bruno, ana])
		const rows = await table(screen)

		expect(
			rows.getAllByRole('columnheader').map((cell) => cell.textContent),
		).toEqual(['Nome', 'Idade', 'Nascimento', 'Turma', 'Ações'])
		expect(await rowNames(screen)).toEqual(['Ana Lima', 'Bruno Reis'])
		const anaRow = within(
			rows.getByText('Ana Lima').closest('tr') as HTMLElement,
		)
		for (const text of ['4 anos', '10/03/2022', 'Turma 1']) {
			expect(anaRow.getByText(text)).toBeDefined()
		}
		const brunoRow = within(
			rows.getByText('Bruno Reis').closest('tr') as HTMLElement,
		)
		for (const text of ['8 meses', '10/02/2026', 'Turma 2']) {
			expect(brunoRow.getByText(text)).toBeDefined()
		}
		expect(
			screen.getByRole('heading', { level: 1, name: 'Crianças' }),
		).toBeDefined()
		expect(screen.getByText('2 crianças cadastradas')).toBeDefined()
		expect(
			screen.getByRole('table', { name: 'Crianças' }).closest('.hidden'),
		).not.toBeNull()
	})

	it('usa o singular com uma criança', async () => {
		const { screen } = await open('/criancas', [child('Ana Lima')])
		expect(await screen.findByText('1 criança cadastrada')).toBeDefined()
	})

	it("o título da aba é 'Crianças · Educare'", async () => {
		const head = await ChildrenRoute.options.head?.({} as never)
		expect(head?.meta).toEqual([{ title: 'Crianças · Educare' }])
	})

	it('"Nova criança" leva a /criancas/nova', async () => {
		const { screen } = await open('/criancas', [child('Ana Lima')])
		await table(screen)
		expect(
			screen.getByRole('link', { name: 'Nova criança' }).getAttribute('href'),
		).toBe('/criancas/nova')
	})

	for (const role of ['COORDENADOR', 'EDUCADOR'] as const) {
		it(`para ${role}, cada linha só tem "Ver <nome>", sem Editar nem Excluir`, async () => {
			const ana = child('Ana Lima')
			const { screen } = await open(
				'/criancas',
				[ana, child('Bruno Reis')],
				role,
			)
			const row = within(
				(await table(screen))
					.getByText('Ana Lima')
					.closest('tr') as HTMLElement,
			)
			const actions = row.getAllByRole('cell')[4]
			expect(
				within(actions)
					.getAllByRole('link')
					.map((link) => link.getAttribute('aria-label')),
			).toEqual(['Ver Ana Lima'])
			expect(
				row.getByRole('link', { name: 'Ver Ana Lima' }).getAttribute('href'),
			).toBe(`/criancas/${ana.id}`)
			expect(within(actions).queryAllByRole('button')).toHaveLength(0)
			expect(
				screen.queryAllByRole('button', { name: /Editar|Excluir/ }),
			).toHaveLength(0)
			expect(
				screen.queryAllByRole('link', { name: /Editar|Excluir/ }),
			).toHaveLength(0)
		})
	}

	it('o nome abre os detalhes sem recarregar', async () => {
		const ana = child('Ana Lima')
		const { screen, router } = await open('/criancas', [ana])
		fireEvent.click(
			(await table(screen)).getByRole('link', { name: 'Ana Lima' }),
		)

		expect(await screen.findByText('Página de detalhes')).toBeDefined()
		expect(router.state.location.pathname).toBe(`/criancas/${ana.id}`)
	})

	it('tem os cartões para o celular, e o cartão abre os detalhes', async () => {
		const ana = child('Ana Lima', '2022-03-10', turma1)
		const { screen, router } = await open('/criancas', [ana])
		await table(screen)
		const list = screen.getByRole('list', { name: 'Crianças' })
		expect(list.className).toContain('md:hidden')
		const card = within(list).getByRole('link')
		expect(card.textContent).toContain('Ana Lima')
		expect(card.textContent).toContain('4 anos')
		expect(card.textContent).toContain('Turma 1')
		expect(card.className).toContain('min-h-11')

		fireEvent.click(card)
		expect(await screen.findByText('Página de detalhes')).toBeDefined()
		expect(router.state.location.pathname).toBe(`/criancas/${ana.id}`)
	})
})

describe('busca e filtro por turma', () => {
	const people = () => [
		child('João Pedro', '2022-03-10', turma1),
		child('Joana Dias', '2022-03-10', turma1),
		child('João Vitor', '2022-03-10', turma2),
	]

	it('busca sem acento, filtra pela turma e guarda os dois na URL', async () => {
		const { screen, router } = await open('/criancas', people())
		await table(screen)

		fireEvent.change(searchBox(screen), { target: { value: 'joao' } })
		await waitFor(() => expect(url(router)).toBe('/criancas?nome=joao'))
		await waitFor(async () =>
			expect(await rowNames(screen)).toEqual(['João Pedro', 'João Vitor']),
		)

		await chooseClassroom(screen, 'Turma 1')
		await waitFor(() =>
			expect(url(router)).toBe(`/criancas?nome=joao&turma=${turma1.id}`),
		)
		await waitFor(async () =>
			expect(await rowNames(screen)).toEqual(['João Pedro']),
		)
		expect(screen.getByText('1 criança encontrada')).toBeDefined()
	})

	it('o seletor tem "Todas as turmas" e as turmas em ordem alfabética', async () => {
		const { screen } = await open('/criancas', people())
		await table(screen)
		fireEvent.keyDown(screen.getByRole('combobox', { name: 'Turma' }), {
			key: 'ArrowDown',
		})
		const options = await screen.findAllByRole('option')
		expect(options.map((option) => option.textContent)).toEqual([
			'Todas as turmas',
			'Turma 1',
			'Turma 2',
		])
	})

	it('recarregar mantém os filtros', async () => {
		const { screen } = await open(
			`/criancas?nome=joao&turma=${turma1.id}`,
			people(),
		)
		expect(await rowNames(screen)).toEqual(['João Pedro'])
		expect((searchBox(screen) as HTMLInputElement).value).toBe('joao')
		expect(screen.getByRole('combobox', { name: 'Turma' }).textContent).toBe(
			'Turma 1',
		)
		expect(calledWith({ nome: 'joao', turma: turma1.id })).toHaveLength(1)
	})

	it('busca uma só vez, 300 ms depois da última tecla', async () => {
		const { screen, router } = await open('/criancas', people())
		await table(screen)
		listMock.mockClear()

		vi.useFakeTimers({
			toFake: ['setTimeout', 'clearTimeout', 'Date'],
			now: TODAY,
		})
		for (const value of ['j', 'jo', 'joa', 'joao']) {
			fireEvent.change(searchBox(screen), { target: { value } })
			act(() => {
				vi.advanceTimersByTime(100)
			})
		}
		act(() => {
			vi.advanceTimersByTime(199)
		})
		expect(url(router)).toBe('/criancas')
		expect(listMock).not.toHaveBeenCalled()

		await act(async () => {
			await vi.advanceTimersByTimeAsync(1)
		})
		await act(async () => {
			await vi.advanceTimersByTimeAsync(50)
		})
		vi.useRealTimers()
		vi.useFakeTimers({ toFake: ['Date'], now: TODAY, shouldAdvanceTime: true })

		await waitFor(() => expect(url(router)).toBe('/criancas?nome=joao'))
		await waitFor(async () =>
			expect(await rowNames(screen)).toEqual(['João Pedro', 'João Vitor']),
		)
		expect(listMock).toHaveBeenCalledTimes(1)
		expect(calledWith({ nome: 'joao', pagina: 1 })).toHaveLength(1)
	})

	it('mudar a busca ou a turma volta à página 1', async () => {
		const many = Array.from({ length: 25 }, (_, i) =>
			child(`Criança ${String(i + 1).padStart(2, '0')}`),
		)
		const { screen, router } = await open('/criancas?pagina=2', many)
		await screen.findByText('Mostrando 21–25 de 25')

		await chooseClassroom(screen, 'Turma 1')
		await waitFor(() =>
			expect(url(router)).toBe(`/criancas?turma=${turma1.id}`),
		)
		expect(await screen.findByText('Mostrando 1–20 de 25')).toBeDefined()
	})

	it('ignora valores inválidos no endereço', async () => {
		const { screen } = await open('/criancas?turma=abc&pagina=-2', people())
		await table(screen)
		expect(screen.getByRole('combobox', { name: 'Turma' }).textContent).toBe(
			'Todas as turmas',
		)
		expect(screen.getByText('Mostrando 1–3 de 3')).toBeDefined()
		expect(listMock).toHaveBeenCalledWith({ data: { pagina: 1 } })
	})
})

describe('paginação', () => {
	const many = () =>
		Array.from({ length: 45 }, (_, i) =>
			child(`Criança ${String(i + 1).padStart(2, '0')}`),
		)

	it('vai para a próxima página e guarda na URL', async () => {
		const { screen, router } = await open('/criancas', many())
		expect(await screen.findByText('Mostrando 1–20 de 45')).toBeDefined()
		expect(
			(screen.getByRole('button', { name: 'Anterior' }) as HTMLButtonElement)
				.disabled,
		).toBe(true)

		fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))
		expect(await screen.findByText('Mostrando 21–40 de 45')).toBeDefined()
		expect(url(router)).toBe('/criancas?pagina=2')
	})

	it('antecipa a próxima página', async () => {
		const { screen } = await open('/criancas', many())
		await screen.findByText('Mostrando 1–20 de 45')
		await waitFor(() => expect(calledWith({ pagina: 2 })).toHaveLength(1))
	})

	it('na última página, "Próxima" fica desabilitado', async () => {
		const { screen } = await open('/criancas?pagina=3', many())
		expect(await screen.findByText('Mostrando 41–45 de 45')).toBeDefined()
		expect(
			(screen.getByRole('button', { name: 'Próxima' }) as HTMLButtonElement)
				.disabled,
		).toBe(true)
	})

	it('uma página além da última leva à última', async () => {
		const { screen, router } = await open('/criancas?pagina=9', many())
		expect(await screen.findByText('Mostrando 41–45 de 45')).toBeDefined()
		expect(url(router)).toBe('/criancas?pagina=3')
	})
})

describe('estados da lista', () => {
	it('mostra o carregamento na primeira carga do navegador', async () => {
		listMock.mockImplementation(() => new Promise(() => {}))
		session('EDUCADOR')
		const { screen, router } = await mount('/')
		void router.navigate({ to: '/criancas' })

		expect(
			await screen.findAllByTestId('child-skeleton', {}, { timeout: 3000 }),
		).toHaveLength(3)
		expect(
			screen.getByRole('heading', { level: 1, name: 'Crianças' }),
		).toBeDefined()
		expect(screen.queryByText(/crianças? cadastradas?/)).toBeNull()
		expect(screen.queryByText(/^Mostrando/)).toBeNull()
	})

	it('sem crianças, mostra "Nenhuma criança cadastrada" e "Nova criança"', async () => {
		const { screen } = await open('/criancas', [])
		expect(await screen.findByText('Nenhuma criança cadastrada')).toBeDefined()
		expect(screen.getAllByRole('link', { name: 'Nova criança' })).toHaveLength(
			2,
		)
		expect(screen.queryByRole('table')).toBeNull()
	})

	it('filtro sem resultado: "Limpar filtros" volta para /criancas', async () => {
		const { screen, router } = await open(
			`/criancas?nome=zzz&turma=${turma1.id}`,
			[child('Ana Lima')],
		)
		expect(await screen.findByText('Nenhuma criança encontrada')).toBeDefined()
		expect(screen.getByText('0 crianças encontradas')).toBeDefined()

		fireEvent.click(screen.getByRole('link', { name: 'Limpar filtros' }))
		await waitFor(() => expect(url(router)).toBe('/criancas'))
		expect(await table(screen)).toBeDefined()
		expect((searchBox(screen) as HTMLInputElement).value).toBe('')
		expect(screen.getByRole('combobox', { name: 'Turma' }).textContent).toBe(
			'Todas as turmas',
		)
	})

	it('mostra o erro e busca de novo com "Tentar de novo"', async () => {
		let fail = true
		db = [child('Ana Lima')]
		listMock.mockImplementation((async ({ data }: { data: ChildrenFilters }) =>
			fail
				? { ok: false, message: messages.unavailable }
				: listing(data)) as never)
		session('EDUCADOR')
		const { screen } = await mount('/criancas')

		expect(
			await screen.findByText(
				'Não foi possível falar com o servidor. Tente de novo em instantes.',
			),
		).toBeDefined()
		expect(listMock).toHaveBeenCalledTimes(1)
		fail = false
		fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
		expect(await rowNames(screen)).toEqual(['Ana Lima'])
		expect(screen.queryByText(messages.unavailable)).toBeNull()
	})

	it('"Atualizar" busca de novo só a lista mostrada', async () => {
		const { screen, queryClient } = await open('/criancas', [child('Ana Lima')])
		await table(screen)
		expect(screen.getByText('Atualizado agora')).toBeDefined()

		const key = keys.childList({ pagina: 1 })
		act(() => {
			queryClient.setQueryData(key, queryClient.getQueryData(key), {
				updatedAt: Date.now() - 3 * 60_000,
			})
		})
		expect(await screen.findByText('Atualizado há 3 min')).toBeDefined()

		listMock.mockClear()
		classroomsMock.mockClear()
		fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }))
		expect(await screen.findByText('Atualizado agora')).toBeDefined()
		expect(listMock).toHaveBeenCalledTimes(1)
		expect(listMock).toHaveBeenCalledWith({ data: { pagina: 1 } })
		expect(classroomsMock).not.toHaveBeenCalled()
	})
})
