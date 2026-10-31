import { cleanup, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readSidebarOpen } from '#/components/layout/sidebar-state'
import { preventCaching } from '#/integrations/educare-api/cache'
import { getCurrentUser } from '#/integrations/educare-api/functions'
import { attach, renderRoutes } from '#/testing/render-route'
import { Route as AuthenticatedRoute } from './_authenticated'
import { Route as HomeRoute } from './_authenticated/index'
import { Route as ChangePasswordRoute } from './_authenticated/minha-conta/senha'
import { Route as TurmasRoute } from './_authenticated/turmas'

vi.mock('#/integrations/educare-api/functions', () => ({
	login: vi.fn(),
	logout: vi.fn(),
	getCurrentUser: vi.fn(),
	changeOwnPassword: vi.fn(),
}))

// No Vitest não há o compilador do Start para escolher a versão do navegador.
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
const sidebarOpenMock = vi.mocked(readSidebarOpen)

const ana = {
	id: '1',
	name: 'Ana Souza',
	login: 'ana.souza@educare.org',
	role: 'USER',
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

function open(url: string) {
	return renderRoutes(url, (root) => {
		const layout = attach(AuthenticatedRoute, root, { id: '/_authenticated' })
		return [
			layout.addChildren([
				attach(HomeRoute, layout, { id: '/', path: '/' }),
				attach(ChangePasswordRoute, layout, {
					id: '/minha-conta/senha',
					path: '/minha-conta/senha',
				}),
				attach(TurmasRoute, layout, { id: '/turmas', path: '/turmas' }),
			]),
		]
	})
}

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
	vi.unstubAllGlobals()
})

describe('rotas protegidas', () => {
	it('sem sessão, leva ao login com a página pedida, sem o formulário', async () => {
		sessionMock.mockResolvedValue({ user: null, expired: false } as never)
		const { screen, router } = await open('/minha-conta/senha')

		expect(await screen.findByText('Página de login')).toBeDefined()
		expect(router.state.location.pathname).toBe('/login')
		expect(router.state.location.search).toEqual({
			redirect: '/minha-conta/senha',
		})
		expect(screen.queryByLabelText('Senha atual')).toBeNull()
	})

	it('com a sessão expirada, leva ao login com o aviso', async () => {
		sessionMock.mockResolvedValue({ user: null, expired: true } as never)
		const { router } = await open('/')

		expect(router.state.location.pathname).toBe('/login')
		expect(router.state.location.search).toEqual({
			redirect: '/',
			motivo: 'sessao-expirada',
		})
	})

	it('com sessão, mostra a página e o usuário no cabeçalho', async () => {
		sessionMock.mockResolvedValue({
			user: {
				id: '1',
				name: 'Ana Souza',
				login: 'ana.souza@educare.org',
				role: 'USER',
			},
			expired: false,
		} as never)
		const { screen } = await open('/')

		expect(await screen.findByText('Bem-vindo(a), Ana Souza')).toBeDefined()
		expect(screen.getByText('Funcionário')).toBeDefined()
		expect(preventCaching).toHaveBeenCalled()
	})

	it('página provisória sem sessão leva ao login', async () => {
		sessionMock.mockResolvedValue({ user: null, expired: false } as never)
		const { router } = await open('/turmas')

		expect(router.state.location.pathname).toBe('/login')
		expect(router.state.location.search).toEqual({ redirect: '/turmas' })
	})

	it('com sessão, mostra a barra lateral e o cabeçalho', async () => {
		sessionMock.mockResolvedValue({ user: ana, expired: false } as never)
		const { screen } = await open('/turmas')

		const nav = within(
			await screen.findByRole('navigation', { name: 'Menu principal' }),
		)
		expect(
			nav.getByRole('link', { name: 'Turmas' }).getAttribute('aria-current'),
		).toBe('page')
		const header = within(screen.getByRole('banner'))
		expect(header.getByText('Turmas')).toBeDefined()
		expect(
			screen.getByRole('heading', { level: 1, name: 'Turmas' }),
		).toBeDefined()
	})

	it('abre a barra expandida quando o cookie não a recolheu', async () => {
		sessionMock.mockResolvedValue({ user: ana, expired: false } as never)
		sidebarOpenMock.mockReturnValue(true)
		const { screen } = await open('/')

		expect(
			await screen.findByRole('button', { name: 'Recolher menu' }),
		).toBeDefined()
		expect(
			document
				.querySelector('[data-slot="sidebar"]')
				?.getAttribute('data-state'),
		).toBe('expanded')
	})

	it('abre a barra recolhida quando o cookie a recolheu', async () => {
		sessionMock.mockResolvedValue({ user: ana, expired: false } as never)
		sidebarOpenMock.mockReturnValue(false)
		const { screen } = await open('/')

		expect(
			await screen.findByRole('button', { name: 'Expandir menu' }),
		).toBeDefined()
		expect(
			document
				.querySelector('[data-slot="sidebar"]')
				?.getAttribute('data-state'),
		).toBe('collapsed')
	})
})
