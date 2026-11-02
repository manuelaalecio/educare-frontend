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
	ChildrenFilters,
} from '#/integrations/educare-api/children'
import type { Classroom } from '#/integrations/educare-api/classrooms'
import {
	createChild,
	deleteChild,
	getChild,
	getChildClassrooms,
	getChildren,
	getClassrooms,
	getCurrentUser,
	updateChild,
} from '#/integrations/educare-api/functions'
import { messages } from '#/integrations/educare-api/messages'
import { keys } from '#/integrations/educare-api/queries'
import { attach, renderRoutes } from '#/testing/render-route'
import { Route as AuthenticatedRoute } from './_authenticated'
import { Route as SettingsRoute } from './_authenticated/configuracoes'
import { Route as ClassroomsTabRoute } from './_authenticated/configuracoes/turmas'
import { Route as EditChildRoute } from './_authenticated/criancas/$childId/editar'
import { Route as ChildRoute } from './_authenticated/criancas/$childId/index'
import { Route as ChildrenRoute } from './_authenticated/criancas/index'
import { Route as NewChildRoute } from './_authenticated/criancas/nova'

// Cenários de "Dados de crianças atualizados sem recarregar" (design, D1–D4):
// as rotas de verdade num só router, com uma API falsa em memória.

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

vi.mock('@tanstack/react-start', async (importOriginal) => ({
	...(await importOriginal<typeof import('@tanstack/react-start')>()),
	useServerFn: (fn: unknown) => fn,
}))

const sessionMock = vi.mocked(getCurrentUser)
const classroomsMock = vi.mocked(getClassrooms)
const listMock = vi.mocked(getChildren)
const childMock = vi.mocked(getChild)
const historyMock = vi.mocked(getChildClassrooms)
const createMock = vi.mocked(createChild)
const updateMock = vi.mocked(updateChild)
const deleteMock = vi.mocked(deleteChild)

const TODAY = new Date('2026-11-01T15:00:00Z')

const turma1 = { id: '11111111-1111-4111-8111-111111111111', name: 'Turma 1' }
const turma2 = { id: '22222222-2222-4222-8222-222222222222', name: 'Turma 2' }
const turmas = [turma1, turma2]

const ANA_ID = '00000000-0000-4000-8000-000000000001'
const BRUNO_ID = '00000000-0000-4000-8000-000000000002'
const NEW_ID = '00000000-0000-4000-8000-000000000003'

function child(id: string, name: string, classroom = turma1): Child {
	return {
		id,
		name,
		birthDate: '2022-03-10',
		classroom,
		cep: '01310100',
		address: 'Avenida Paulista',
		addressNumber: '1000',
		neighborhood: 'Bela Vista',
		city: 'São Paulo',
		state: 'SP',
		createdAt: '2026-10-01T12:00:00Z',
		updatedAt: '2026-10-01T12:00:00Z',
	}
}

/** Crianças "na API": as server functions falsas leem e gravam aqui. */
let db: Child[] = []

function serveApi() {
	sessionMock.mockResolvedValue({
		user: {
			id: '2',
			name: 'Maria',
			login: 'maria@educare.org',
			role: 'COORDENADOR',
			createdAt: '2026-01-10T12:00:00Z',
		},
		expired: false,
	} as never)
	classroomsMock.mockImplementation((async () => ({
		ok: true,
		classrooms: turmas.map(
			(turma): Classroom => ({
				...turma,
				studentCount: db.filter((item) => item.classroom.id === turma.id)
					.length,
				maleCount: 0,
				femaleCount: 0,
				createdAt: '2026-01-01T00:00:00Z',
			}),
		),
	})) as never)
	listMock.mockImplementation((async ({ data }: { data: ChildrenFilters }) => {
		const found = db
			.filter((item) => !data.turma || item.classroom.id === data.turma)
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(({ id, name, birthDate, classroom }) => ({
				id,
				name,
				birthDate,
				classroom,
			}))
		return {
			ok: true,
			children: found,
			page: {
				number: data.pagina - 1,
				size: 20,
				totalElements: found.length,
				totalPages: found.length ? 1 : 0,
			},
		}
	}) as never)
	childMock.mockImplementation((async ({ data }: { data: { id: string } }) => ({
		ok: true,
		child: db.find((item) => item.id === data.id) ?? null,
	})) as never)
	historyMock.mockImplementation((async ({
		data,
	}: {
		data: { id: string }
	}) => {
		const found = db.find((item) => item.id === data.id)
		return {
			ok: true,
			periods: found
				? [
						{
							classroomId: found.classroom.id,
							classroomName: found.classroom.name,
							startDate: '2026-10-01',
							endDate: null,
						},
					]
				: [],
		}
	}) as never)
	createMock.mockImplementation((async ({
		data,
	}: {
		data: { name: string; classroomId: string }
	}) => {
		const turma = turmas.find((item) => item.id === data.classroomId) ?? turma1
		db.push(child(NEW_ID, data.name, turma))
		return { ok: true, id: NEW_ID }
	}) as never)
	updateMock.mockImplementation((async ({
		data,
	}: {
		data: { id: string; name: string; classroomId: string }
	}) => {
		const turma = turmas.find((item) => item.id === data.classroomId) ?? turma1
		db = db.map((item) =>
			item.id === data.id
				? { ...item, name: data.name, classroom: turma }
				: item,
		)
		return { ok: true, id: data.id }
	}) as never)
	deleteMock.mockImplementation((async ({ data }: { data: { id: string } }) => {
		db = db.filter((item) => item.id !== data.id)
		return { ok: true }
	}) as never)
}

async function open(url: string) {
	serveApi()
	render(<Toaster />)
	return renderRoutes(url, (root) => {
		const layout = attach(AuthenticatedRoute, root, { id: '/_authenticated' })
		const settings = attach(SettingsRoute, layout, {
			id: '/configuracoes',
			path: '/configuracoes',
		})
		return [
			layout.addChildren([
				attach(ChildrenRoute, layout, { id: '/criancas/', path: '/criancas' }),
				attach(NewChildRoute, layout, {
					id: '/criancas/nova',
					path: '/criancas/nova',
				}),
				attach(ChildRoute, layout, {
					id: '/criancas/$childId/',
					path: '/criancas/$childId',
				}),
				attach(EditChildRoute, layout, {
					id: '/criancas/$childId/editar',
					path: '/criancas/$childId/editar',
				}),
				settings.addChildren([
					attach(ClassroomsTabRoute, settings, {
						id: '/turmas',
						path: '/turmas',
					}),
				]),
			]),
		]
	})
}

type Rendered = Awaited<ReturnType<typeof open>>
type Screen = Rendered['screen']

// As seções também têm nome ("Endereço", "Religião"): só os campos contam.
const CONTROLS = 'input, textarea, button'

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

async function fillRequired(screen: Screen, name: string) {
	await choose(screen, 'Turma', 'Turma 1')
	type(screen, 'Nome completo', name)
	type(screen, 'Data de nascimento', '2022-03-15')
	type(screen, 'CEP', '01310100')
	type(screen, 'Endereço', 'Avenida Paulista')
	type(screen, 'Número', '1000')
	type(screen, 'Bairro', 'Bela Vista')
	type(screen, 'Cidade', 'São Paulo')
	await choose(screen, 'UF', 'SP')
}

/** Como um clique de verdade: o botão recebe o foco antes do envio. */
function submit(screen: Screen, name: string) {
	const button = screen.getByRole('button', { name })
	button.focus()
	fireEvent.click(button)
}

/** Nomes nas linhas da tabela "Crianças", na ordem. */
async function rowNames(screen: Screen) {
	const table = within(await screen.findByRole('table', { name: 'Crianças' }))
	return table
		.getAllByRole('row')
		.slice(1)
		.map((row) => within(row).getAllByRole('cell')[0].textContent ?? '')
}

/** Resumo da turma na aba Configurações › Turmas (lista do celular). */
async function classroomSummary(screen: Screen, name: string) {
	const list = within(await screen.findByRole('list', { name: 'Turmas' }))
	const item = list.getByText(name).closest('li') as HTMLElement
	return item.textContent
}

function passTime(ms: number) {
	vi.setSystemTime(Date.now() + ms)
}

function lastListCall() {
	return (listMock.mock.lastCall?.[0] as { data: ChildrenFilters }).data
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'], now: TODAY, shouldAdvanceTime: true })
	db = [
		child(ANA_ID, 'Ana Lima', turma1),
		child(BRUNO_ID, 'Bruno Reis', turma2),
	]
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

describe('voltar sem gravar', () => {
	it('volta à lista em menos de 1 minuto na hora, sem skeleton e sem chamar getChildren', async () => {
		const { screen, router } = await open('/criancas')
		expect(await rowNames(screen)).toEqual(['Ana Lima', 'Bruno Reis'])
		expect(listMock).toHaveBeenCalledTimes(1)

		passTime(20_000)
		fireEvent.click(
			within(await screen.findByRole('table', { name: 'Crianças' })).getByRole(
				'link',
				{ name: 'Ana Lima' },
			),
		)
		expect(
			await screen.findByRole('heading', { level: 1, name: 'Ana Lima' }),
		).toBeDefined()
		expect(router.state.location.pathname).toBe(`/criancas/${ANA_ID}`)

		passTime(20_000)
		fireEvent.click(screen.getByRole('link', { name: 'Voltar para Crianças' }))
		await waitFor(() =>
			expect(router.state.location.pathname).toBe('/criancas'),
		)
		expect(await rowNames(screen)).toEqual(['Ana Lima', 'Bruno Reis'])
		expect(screen.queryAllByTestId('child-skeleton')).toHaveLength(0)
		expect(screen.queryByText('Carregando crianças…')).toBeNull()
		expect(listMock).toHaveBeenCalledTimes(1)
		expect(classroomsMock).toHaveBeenCalledTimes(1)

		// Voltar aos detalhes também não busca a criança de novo.
		router.history.back()
		expect(
			await screen.findByRole('heading', { level: 1, name: 'Ana Lima' }),
		).toBeDefined()
		expect(childMock).toHaveBeenCalledTimes(1)
		expect(historyMock).toHaveBeenCalledTimes(1)
	})

	it('depois de 1 minuto mostra a lista guardada na hora e atualiza em segundo plano', async () => {
		const { screen, router } = await open('/criancas')
		expect(await rowNames(screen)).toEqual(['Ana Lima', 'Bruno Reis'])
		await router.navigate({
			to: '/criancas/$childId',
			params: { childId: ANA_ID },
		})
		await screen.findByRole('heading', { level: 1, name: 'Ana Lima' })

		passTime(61_000)
		db = [...db, child(NEW_ID, 'Carla Dias', turma1)]
		// A nova busca da lista só responde quando o teste mandar.
		const serve = listMock.getMockImplementation()
		let answer: () => void = () => {}
		listMock.mockImplementationOnce((async (
			...args: Parameters<typeof getChildren>
		) => {
			await new Promise<void>((resolve) => {
				answer = resolve
			})
			return serve?.(...args)
		}) as never)
		await router.navigate({ to: '/criancas' })

		// Os dados guardados aparecem na hora, sem skeleton...
		expect(await rowNames(screen)).toEqual(['Ana Lima', 'Bruno Reis'])
		expect(screen.queryAllByTestId('child-skeleton')).toHaveLength(0)
		await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2))
		// ...e a busca em segundo plano traz a criança nova.
		answer()
		await waitFor(() =>
			expect(rowNames(screen)).resolves.toEqual([
				'Ana Lima',
				'Bruno Reis',
				'Carla Dias',
			]),
		)
		expect(listMock).toHaveBeenCalledTimes(2)
	})
})

describe('gravar com sucesso atualiza sem recarregar', () => {
	it('cadastrar invalida crianças e turmas; a lista filtrada e a contagem voltam atualizadas', async () => {
		const { screen, router, queryClient } = await open(
			`/criancas?turma=${turma1.id}`,
		)
		expect(await rowNames(screen)).toEqual(['Ana Lima'])
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

		fireEvent.click(screen.getByRole('link', { name: 'Nova criança' }))
		await screen.findByLabelText('CPF', { selector: CONTROLS })
		await fillRequired(screen, 'Carla Dias')
		submit(screen, 'Cadastrar criança')

		expect(
			await screen.findByRole('heading', { level: 1, name: 'Carla Dias' }),
		).toBeDefined()
		expect(router.state.location.pathname).toBe(`/criancas/${NEW_ID}`)
		expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.children })
		expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.classrooms })

		await router.navigate({ to: '/criancas', search: { turma: turma1.id } })
		await waitFor(() =>
			expect(rowNames(screen)).resolves.toEqual(['Ana Lima', 'Carla Dias']),
		)
		expect(listMock).toHaveBeenCalledTimes(2)
		expect(lastListCall()).toMatchObject({ turma: turma1.id, pagina: 1 })

		await router.navigate({ to: '/configuracoes/turmas' })
		expect(await classroomSummary(screen, 'Turma 1')).toContain(
			'2 crianças · 0 meninos e 0 meninas',
		)
		expect(await classroomSummary(screen, 'Turma 2')).toContain(
			'1 criança · 0 meninos e 0 meninas',
		)
	})

	it('editar (com troca de turma) invalida crianças e turmas; detalhes, lista e contagens voltam atualizados', async () => {
		const { screen, router, queryClient } = await open('/criancas')
		expect(await rowNames(screen)).toEqual(['Ana Lima', 'Bruno Reis'])
		await router.navigate({ to: '/configuracoes/turmas' })
		expect(await classroomSummary(screen, 'Turma 2')).toContain('1 criança ·')
		await router.navigate({
			to: '/criancas/$childId',
			params: { childId: ANA_ID },
		})
		await screen.findByRole('heading', { level: 1, name: 'Ana Lima' })
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

		fireEvent.click(screen.getByRole('link', { name: 'Editar' }))
		await screen.findByLabelText('Nome completo', { selector: CONTROLS })
		type(screen, 'Nome completo', 'Ana Clara Lima')
		await choose(screen, 'Turma', 'Turma 2')
		submit(screen, 'Salvar alterações')

		expect(
			await screen.findByRole('heading', {
				level: 1,
				name: 'Ana Clara Lima',
			}),
		).toBeDefined()
		expect(router.state.location.pathname).toBe(`/criancas/${ANA_ID}`)
		expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.children })
		expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.classrooms })
		// O histórico de turmas também é buscado de novo.
		await waitFor(() => expect(historyMock).toHaveBeenCalledTimes(2))

		fireEvent.click(screen.getByRole('link', { name: 'Voltar para Crianças' }))
		await waitFor(() =>
			expect(rowNames(screen)).resolves.toEqual([
				'Ana Clara Lima',
				'Bruno Reis',
			]),
		)
		const row = within(
			screen
				.getByRole('table', { name: 'Crianças' })
				.querySelector('tbody tr') as HTMLElement,
		)
		expect(row.getByText('Turma 2')).toBeDefined()
		expect(listMock).toHaveBeenCalledTimes(2)

		await router.navigate({ to: '/configuracoes/turmas' })
		expect(await classroomSummary(screen, 'Turma 1')).toContain(
			'0 crianças · 0 meninos e 0 meninas',
		)
		expect(await classroomSummary(screen, 'Turma 2')).toContain(
			'2 crianças · 0 meninos e 0 meninas',
		)
	})

	it('excluir invalida crianças e turmas; a lista e as contagens voltam sem a criança', async () => {
		const { screen, router, queryClient } = await open('/criancas')
		expect(await rowNames(screen)).toEqual(['Ana Lima', 'Bruno Reis'])
		await router.navigate({
			to: '/criancas/$childId',
			params: { childId: ANA_ID },
		})
		await screen.findByRole('heading', { level: 1, name: 'Ana Lima' })
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

		fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
		const dialog = within(
			await screen.findByRole('dialog', { name: 'Excluir Ana Lima?' }),
		)
		fireEvent.click(dialog.getByRole('button', { name: 'Excluir criança' }))

		await waitFor(() =>
			expect(router.state.location.pathname).toBe('/criancas'),
		)
		await waitFor(() =>
			expect(rowNames(screen)).resolves.toEqual(['Bruno Reis']),
		)
		expect(await screen.findByText(messages.childDeleted)).toBeDefined()
		expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.children })
		expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.classrooms })
		expect(listMock).toHaveBeenCalledTimes(2)
		// A criança excluída não é buscada de novo.
		expect(childMock).toHaveBeenCalledTimes(1)

		await router.navigate({ to: '/configuracoes/turmas' })
		expect(await classroomSummary(screen, 'Turma 1')).toContain(
			'0 crianças · 0 meninos e 0 meninas',
		)
	})
})

describe('gravar com erro não busca nada de novo', () => {
	type Case = {
		name: string
		url: string
		act: (screen: Screen) => Promise<void>
		message: string
	}
	const conflict = {
		ok: false,
		kind: 'conflict',
		fieldErrors: { cpf: messages.childCpfTaken },
	}
	const cases: Case[] = [
		{
			name: 'cadastrar com 409',
			url: '/criancas/nova',
			message: messages.childCpfTaken,
			act: async (screen) => {
				createMock.mockResolvedValue(conflict as never)
				await screen.findByLabelText('CPF', { selector: CONTROLS })
				await fillRequired(screen, 'Carla Dias')
				type(screen, 'CPF', '52998224725')
				submit(screen, 'Cadastrar criança')
			},
		},
		{
			name: 'editar com 409',
			url: `/criancas/${ANA_ID}/editar`,
			message: messages.childCpfTaken,
			act: async (screen) => {
				updateMock.mockResolvedValue(conflict as never)
				await screen.findByLabelText('CPF', { selector: CONTROLS })
				type(screen, 'CPF', '52998224725')
				submit(screen, 'Salvar alterações')
			},
		},
		{
			name: 'excluir com 500',
			url: `/criancas/${ANA_ID}`,
			message: messages.unavailable,
			act: async (screen) => {
				deleteMock.mockResolvedValue({
					ok: false,
					kind: 'unavailable',
					message: messages.unavailable,
					fieldErrors: {},
				} as never)
				fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
				const dialog = within(
					await screen.findByRole('dialog', { name: 'Excluir Ana Lima?' }),
				)
				fireEvent.click(dialog.getByRole('button', { name: 'Excluir criança' }))
			},
		},
	]

	it.each(cases)('$name: não invalida e não chama a API de novo', async ({
		url,
		act,
		message,
	}) => {
		const { screen, router, queryClient } = await open('/criancas')
		expect(await rowNames(screen)).toEqual(['Ana Lima', 'Bruno Reis'])
		await router.navigate({ to: url })
		await waitFor(() => expect(router.state.status).toBe('idle'))
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
		const calls = () => [
			listMock.mock.calls.length,
			classroomsMock.mock.calls.length,
			childMock.mock.calls.length,
			historyMock.mock.calls.length,
		]
		const before = calls()

		await act(screen)

		expect(await screen.findByText(message)).toBeDefined()
		expect(router.state.location.pathname).toBe(url)
		expect(invalidate).not.toHaveBeenCalled()
		expect(queryClient.getQueryState(keys.classrooms)?.isInvalidated).toBe(
			false,
		)
		expect(
			queryClient.getQueryState(keys.childList({ pagina: 1 }))?.isInvalidated,
		).toBe(false)
		expect(calls()).toEqual(before)

		// Voltar à lista (menos de 1 minuto depois) também não busca.
		// (sem o aviso de "Sair sem salvar?" do formulário com alterações).
		await router.navigate({ to: '/criancas', ignoreBlocker: true })
		expect(router.state.location.pathname).toBe('/criancas')
		expect(await rowNames(screen)).toEqual(['Ana Lima', 'Bruno Reis'])
		expect(listMock).toHaveBeenCalledTimes(1)
	})
})
