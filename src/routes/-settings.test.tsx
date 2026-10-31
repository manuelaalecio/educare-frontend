import { cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser } from '#/integrations/educare-api/functions'
import { attach, renderRoutes } from '#/testing/render-route'
import { Route as AuthenticatedRoute } from './_authenticated'
import { Route as SettingsRoute } from './_authenticated/configuracoes'
import { Route as SettingsIndexRoute } from './_authenticated/configuracoes/index'
import { Route as ClassroomsTabRoute } from './_authenticated/configuracoes/turmas'
import { Route as UsersTabRoute } from './_authenticated/configuracoes/usuarios'

vi.mock('#/integrations/educare-api/functions', () => ({
	login: vi.fn(),
	logout: vi.fn(),
	getCurrentUser: vi.fn(),
	changeOwnPassword: vi.fn(),
	getClassrooms: vi.fn(async () => ({ ok: true, classrooms: [] })),
	createClassroom: vi.fn(),
	renameClassroom: vi.fn(),
	deleteClassroom: vi.fn(),
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

const ana = {
	id: '1',
	name: 'Ana Souza',
	login: 'ana.souza@educare.org',
	role: 'USER',
	createdAt: '2026-03-12T14:00:00Z',
}

const admin = { ...ana, id: '2', name: 'Administrador', role: 'ADMIN' }

function open(url: string, user: typeof ana) {
	sessionMock.mockResolvedValue({ user, expired: false } as never)
	return renderRoutes(url, (root) => {
		const layout = attach(AuthenticatedRoute, root, { id: '/_authenticated' })
		const settings = attach(SettingsRoute, layout, {
			id: '/configuracoes',
			path: '/configuracoes',
		})
		return [
			layout.addChildren([
				settings.addChildren([
					attach(SettingsIndexRoute, settings, { id: '/', path: '/' }),
					attach(UsersTabRoute, settings, {
						id: '/usuarios',
						path: '/usuarios',
					}),
					attach(ClassroomsTabRoute, settings, {
						id: '/turmas',
						path: '/turmas',
					}),
				]),
			]),
		]
	})
}

type Screen = Awaited<ReturnType<typeof open>>['screen']

function tabs(screen: Screen) {
	return within(
		screen.getByRole('navigation', { name: 'Seções das configurações' }),
	)
}

function currentTabs(screen: Screen) {
	return tabs(screen)
		.getAllByRole('link')
		.filter((link) => link.getAttribute('aria-current') === 'page')
		.map((link) => link.textContent)
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
})

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
	vi.unstubAllGlobals()
})

describe('acesso a Configurações', () => {
	it('USER na aba Turmas vai para o Início, sem deixar a aba no histórico', async () => {
		const { router, screen } = await open('/', ana)
		await screen.findByText('Página inicial')

		await router.navigate({ to: '/configuracoes/turmas' })

		await waitFor(() => expect(router.state.location.pathname).toBe('/'))
		expect(
			screen.queryByRole('heading', { level: 1, name: 'Configurações' }),
		).toBeNull()
		router.history.back()
		await waitFor(() => expect(router.state.location.pathname).toBe('/'))
	})

	it('USER em /configuracoes vai para o Início', async () => {
		const { router, screen } = await open('/configuracoes', ana)
		expect(router.state.location.pathname).toBe('/')
		expect(await screen.findByText('Página inicial')).toBeDefined()
	})

	it('sem sessão, vai para o login', async () => {
		sessionMock.mockResolvedValue({ user: null, expired: false } as never)
		const { router } = await renderRoutes('/configuracoes/turmas', (root) => {
			const layout = attach(AuthenticatedRoute, root, {
				id: '/_authenticated',
			})
			const settings = attach(SettingsRoute, layout, {
				id: '/configuracoes',
				path: '/configuracoes',
			})
			return [
				layout.addChildren([
					settings.addChildren([
						attach(ClassroomsTabRoute, settings, {
							id: '/turmas',
							path: '/turmas',
						}),
					]),
				]),
			]
		})
		expect(router.state.location.href).toBe(
			'/login?redirect=%2Fconfiguracoes%2Fturmas',
		)
	})

	it('ADMIN vê a área com a aba Turmas', async () => {
		const { screen } = await open('/configuracoes/turmas', admin)
		expect(
			await screen.findByRole('heading', { level: 1, name: 'Configurações' }),
		).toBeDefined()
		expect(
			screen.getByText(
				'Usuários do sistema e turmas da escola. Só administradores acessam esta área.',
			),
		).toBeDefined()
		expect(
			tabs(screen)
				.getAllByRole('link')
				.map((link) => link.textContent),
		).toEqual(['Usuários', 'Turmas'])
		expect(currentTabs(screen)).toEqual(['Turmas'])
	})
})

describe('abas', () => {
	it('trocar de aba muda o endereço e a aba atual', async () => {
		const { router, screen } = await open('/configuracoes/turmas', admin)
		fireEvent.click(await tabs(screen).findByRole('link', { name: 'Usuários' }))

		await waitFor(() =>
			expect(router.state.location.pathname).toBe('/configuracoes/usuarios'),
		)
		expect(currentTabs(screen)).toEqual(['Usuários'])
	})

	it('Configurações na barra lateral abre a aba Usuários', async () => {
		const { router, screen } = await open('/configuracoes/turmas', admin)
		const sidebar = within(
			await screen.findByRole('navigation', { name: 'Menu principal' }),
		)
		fireEvent.click(sidebar.getByRole('link', { name: 'Configurações' }))

		await waitFor(() =>
			expect(router.state.location.pathname).toBe('/configuracoes/usuarios'),
		)
		expect(currentTabs(screen)).toEqual(['Usuários'])
	})

	it('a aba Usuários é provisória', async () => {
		const { screen } = await open('/configuracoes/usuarios', admin)
		expect(
			await screen.findByRole('heading', { level: 2, name: 'Usuários' }),
		).toBeDefined()
		expect(
			screen.getByText('Esta seção ainda está em construção.'),
		).toBeDefined()
		expect(UsersTabRoute.options.head?.({} as never)).toEqual({
			meta: [{ title: 'Usuários · Configurações · Educare' }],
		})
	})
})
