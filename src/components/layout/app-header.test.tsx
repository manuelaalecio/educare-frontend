import { createRoute } from '@tanstack/react-router'
import { cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarProvider } from '#/components/ui/sidebar'
import type { CurrentUser } from '#/integrations/educare-api/auth'
import { renderRoutes } from '#/testing/render-route'
import { AppHeader } from './app-header'

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

function openWith(user: CurrentUser, path = '/') {
	return renderRoutes(path, (root) => [
		createRoute({
			getParentRoute: () => root,
			path,
			component: () => (
				<SidebarProvider>
					<AppHeader user={user} />
				</SidebarProvider>
			),
		}),
	])
}

type Screen = Awaited<ReturnType<typeof openWith>>['screen']

async function headerOf(screen: Screen) {
	return within(await screen.findByRole('banner'))
}

beforeEach(() => {
	document.documentElement.className = ''
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

describe('AppHeader', () => {
	it('mostra o botão de recolher, o título, o tema e o menu do usuário', async () => {
		const { screen } = await openWith(ana, '/turmas')
		const header = await headerOf(screen)
		expect(header.getByRole('button', { name: 'Recolher menu' })).toBeDefined()
		expect(header.getByText('Turmas')).toBeDefined()
		expect(
			await header.findByRole('button', { name: 'Usar tema escuro' }),
		).toBeDefined()
		expect(
			header.getByRole('button', { name: 'Menu do usuário: Ana Souza' }),
		).toBeDefined()
	})

	it('tem o botão Abrir menu e a marca para o celular', async () => {
		const { screen } = await openWith(ana)
		const header = await headerOf(screen)
		expect(header.getByRole('button', { name: 'Abrir menu' })).toBeDefined()
		expect(header.getByText('Educare')).toBeDefined()
	})

	it('alterna entre Recolher menu e Expandir menu', async () => {
		const { screen } = await openWith(ana)
		const header = await headerOf(screen)
		fireEvent.click(header.getByRole('button', { name: 'Recolher menu' }))
		expect(header.getByRole('button', { name: 'Expandir menu' })).toBeDefined()
		fireEvent.click(header.getByRole('button', { name: 'Expandir menu' }))
		expect(header.getByRole('button', { name: 'Recolher menu' })).toBeDefined()
	})

	it('tem um único botão de tema', async () => {
		const { screen } = await openWith(ana)
		await waitFor(() =>
			expect(
				screen.getAllByRole('button', { name: /^Usar tema (claro|escuro)$/ }),
			).toHaveLength(1),
		)
	})

	it('mostra nome e role de um ADMIN', async () => {
		const { screen } = await openWith(admin)
		const button = within(
			await screen.findByRole('button', {
				name: 'Menu do usuário: Administrador',
			}),
		)
		expect(button.getAllByText('Administrador')).toHaveLength(2)
	})

	it('mostra nome e role de um USER', async () => {
		const { screen } = await openWith(ana)
		const button = within(
			await screen.findByRole('button', { name: 'Menu do usuário: Ana Souza' }),
		)
		expect(button.getByText('Ana Souza')).toBeDefined()
		expect(button.getByText('Funcionário')).toBeDefined()
	})

	it('mostra uma role desconhecida como veio', async () => {
		const { screen } = await openWith({ ...ana, role: 'SECRETARIA' })
		expect(await screen.findByText('SECRETARIA')).toBeDefined()
	})
})
