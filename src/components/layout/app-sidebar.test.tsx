import { createRoute, Outlet } from '@tanstack/react-router'
import { cleanup, fireEvent, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarProvider } from '#/components/ui/sidebar'
import type { CurrentUser } from '#/integrations/educare-api/auth'
import { logout } from '#/integrations/educare-api/functions'
import { renderRoutes } from '#/testing/render-route'
import { AppSidebar } from './app-sidebar'

vi.mock('#/integrations/educare-api/functions', () => ({
	logout: vi.fn(async () => ({ ok: true })),
	getCurrentUser: vi.fn(async () => ({ user: null, expired: false })),
}))

vi.mock('@tanstack/react-start', async (importOriginal) => ({
	...(await importOriginal<typeof import('@tanstack/react-start')>()),
	useServerFn: (fn: unknown) => fn,
}))

const admin: CurrentUser = {
	id: '1',
	name: 'Administrador',
	login: 'admin@educare.org',
	role: 'ADMIN',
}
const ana: CurrentUser = {
	id: '2',
	name: 'Ana Souza',
	login: 'ana.souza@educare.org',
	role: 'USER',
}

/** Barra lateral num layout, com páginas simples nos caminhos pedidos. */
function openWith(user: CurrentUser, url: string) {
	return renderRoutes(url, (root) => {
		const layout = createRoute({
			getParentRoute: () => root,
			id: 'layout',
			component: () => (
				<SidebarProvider>
					<AppSidebar user={user} />
					<Outlet />
				</SidebarProvider>
			),
		})
		const page = (path: string, text: string) =>
			createRoute({
				getParentRoute: () => layout,
				path,
				component: () => <p>{text}</p>,
			})
		return [
			layout.addChildren([
				page('/', 'Página inicial'),
				page('/turmas', 'Página de turmas'),
				page('/alunos/$id', 'Página de um aluno'),
				page('/minha-conta/senha', 'Página de troca de senha'),
			]),
		]
	})
}

async function sidebarOf(
	screen: Awaited<ReturnType<typeof openWith>>['screen'],
) {
	return within(
		await screen.findByRole('navigation', { name: 'Menu principal' }),
	)
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

describe('AppSidebar', () => {
	it('mostra todos os itens para um ADMIN, na ordem', async () => {
		const { screen } = await openWith(admin, '/')
		const nav = await sidebarOf(screen)
		expect(nav.getByText('Educare')).toBeDefined()
		expect(nav.getByText('Menu')).toBeDefined()
		const names = [
			...nav.getAllByRole('link'),
			...nav.getAllByRole('button'),
		].map((el) => el.getAttribute('aria-label'))
		expect(names).toEqual([
			'Início',
			'Alunos',
			'Responsáveis',
			'Turmas',
			'Configurações',
			'Sair',
		])
	})

	it('esconde Configurações de um USER', async () => {
		const { screen } = await openWith(ana, '/')
		const nav = await sidebarOf(screen)
		expect(nav.getByRole('link', { name: 'Turmas' })).toBeDefined()
		expect(nav.queryByRole('link', { name: 'Configurações' })).toBeNull()
		expect(nav.getByRole('button', { name: 'Sair' })).toBeDefined()
	})

	it('navega ao clicar num item, mantendo a barra', async () => {
		const { screen, router } = await openWith(ana, '/')
		const nav = await sidebarOf(screen)
		fireEvent.click(nav.getByRole('link', { name: 'Turmas' }))

		expect(await screen.findByText('Página de turmas')).toBeDefined()
		expect(router.state.location.pathname).toBe('/turmas')
		expect(
			screen.getByRole('navigation', { name: 'Menu principal' }),
		).toBeDefined()
	})

	it('marca só o Início em /', async () => {
		const { screen } = await openWith(ana, '/')
		const nav = await sidebarOf(screen)
		const current = nav
			.getAllByRole('link')
			.filter((link) => link.getAttribute('aria-current') === 'page')
		expect(current.map((link) => link.getAttribute('aria-label'))).toEqual([
			'Início',
		])
		expect(
			nav.getByRole('link', { name: 'Início' }).getAttribute('data-active'),
		).toBe('true')
	})

	it('marca só Alunos numa subpágina de alunos', async () => {
		const { screen } = await openWith(ana, '/alunos/123')
		const nav = await sidebarOf(screen)
		const current = nav
			.getAllByRole('link')
			.filter((link) => link.getAttribute('aria-current') === 'page')
		expect(current.map((link) => link.getAttribute('aria-label'))).toEqual([
			'Alunos',
		])
	})

	it('não marca nenhum item numa página fora da barra', async () => {
		const { screen } = await openWith(ana, '/minha-conta/senha')
		const nav = await sidebarOf(screen)
		expect(
			nav
				.getAllByRole('link')
				.some((link) => link.getAttribute('aria-current') === 'page'),
		).toBe(false)
	})

	it('ao sair pela barra, apaga a sessão, limpa o cache e vai ao login', async () => {
		const { screen, router, queryClient } = await openWith(ana, '/turmas')
		queryClient.setQueryData(['educare-api', 'criancas'], [{ nome: 'Bia' }])
		const nav = await sidebarOf(screen)

		fireEvent.click(nav.getByRole('button', { name: 'Sair' }))

		expect(await screen.findByText('Página de login')).toBeDefined()
		expect(logout).toHaveBeenCalledTimes(1)
		expect(router.state.location.pathname).toBe('/login')
		expect(router.state.location.search).toEqual({})
		expect(
			queryClient.getQueryData(['educare-api', 'criancas']),
		).toBeUndefined()
	})
})
