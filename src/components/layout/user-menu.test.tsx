import { createRoute } from '@tanstack/react-router'
import {
	act,
	cleanup,
	fireEvent,
	waitFor,
	within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CurrentUser } from '#/integrations/educare-api/auth'
import { logout } from '#/integrations/educare-api/functions'
import { renderRoutes } from '#/testing/render-route'
import { UserMenu } from './user-menu'

vi.mock('#/integrations/educare-api/functions', () => ({
	logout: vi.fn(async () => ({ ok: true })),
	getCurrentUser: vi.fn(async () => ({ user: null, expired: false })),
}))

vi.mock('@tanstack/react-start', async (importOriginal) => ({
	...(await importOriginal<typeof import('@tanstack/react-start')>()),
	useServerFn: (fn: unknown) => fn,
}))

const ana: CurrentUser = {
	id: '2',
	name: 'Ana Souza',
	login: 'ana.souza@educare.org',
	role: 'USER',
	createdAt: '2026-03-12T14:00:00Z',
}

function openWith(user: CurrentUser) {
	return renderRoutes('/', (root) => [
		createRoute({
			getParentRoute: () => root,
			path: '/',
			component: () => <UserMenu user={user} />,
		}),
	])
}

type Screen = Awaited<ReturnType<typeof openWith>>['screen']

async function trigger(screen: Screen, name = 'Ana Souza') {
	return screen.findByRole('button', { name: `Menu do usuário: ${name}` })
}

/** O Radix abre o menu no `pointerdown` com o botão principal. */
function press(element: HTMLElement) {
	act(() => {
		fireEvent.pointerDown(element, { button: 0, ctrlKey: false })
	})
}

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

describe('UserMenu', () => {
	it('mostra as iniciais, o nome e a role no botão', async () => {
		const { screen } = await openWith(ana)
		const button = within(await trigger(screen))
		expect(button.getByText('AS')).toBeDefined()
		expect(button.getByText('Ana Souza')).toBeDefined()
		expect(button.getByText('Funcionário')).toBeDefined()
	})

	it('usa as duas primeiras letras de um nome com uma palavra', async () => {
		const { screen } = await openWith({
			...ana,
			name: 'Administrador',
			role: 'ADMIN',
		})
		const button = within(await trigger(screen, 'Administrador'))
		expect(button.getByText('AD')).toBeDefined()
	})

	it('abre o menu com o nome, o email e os itens', async () => {
		const { screen } = await openWith(ana)
		press(await trigger(screen))

		const menu = within(
			await screen.findByRole('menu', { name: 'Menu do usuário' }),
		)
		expect(menu.getByText('Ana Souza')).toBeDefined()
		expect(menu.getByText('ana.souza@educare.org')).toBeDefined()
		expect(menu.getByRole('menuitem', { name: 'Minha conta' })).toBeDefined()
		expect(menu.getByRole('menuitem', { name: 'Sair' })).toBeDefined()
	})

	it('Minha conta leva a /minha-conta e fecha o menu', async () => {
		const { screen, router } = await openWith(ana)
		press(await trigger(screen))

		const item = await screen.findByRole('menuitem', { name: 'Minha conta' })
		expect(item.getAttribute('href')).toBe('/minha-conta')
		fireEvent.click(item)

		expect(await screen.findByText('Página Minha conta')).toBeDefined()
		expect(router.state.location.pathname).toBe('/minha-conta')
		expect(screen.queryByRole('menu')).toBeNull()
	})

	it('abre pelo teclado e fecha com Esc, devolvendo o foco', async () => {
		const { screen } = await openWith(ana)
		const button = await trigger(screen)
		button.focus()

		fireEvent.keyDown(button, { key: 'Enter' })
		const menu = await screen.findByRole('menu', { name: 'Menu do usuário' })
		fireEvent.keyDown(menu, { key: 'ArrowDown' })
		expect(document.activeElement?.getAttribute('role')).toBe('menuitem')

		fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' })
		expect(screen.queryByRole('menu')).toBeNull()
		// O Radix devolve o foco num setTimeout.
		await waitFor(() => expect(document.activeElement).toBe(button))
	})

	it('ao sair pelo menu, apaga a sessão, limpa o cache e vai ao login', async () => {
		const { screen, router, queryClient } = await openWith(ana)
		queryClient.setQueryData(['educare-api', 'criancas'], [{ nome: 'Bia' }])
		press(await trigger(screen))

		fireEvent.click(await screen.findByRole('menuitem', { name: 'Sair' }))

		expect(await screen.findByText('Página de login')).toBeDefined()
		expect(logout).toHaveBeenCalledTimes(1)
		expect(router.state.location.pathname).toBe('/login')
		expect(router.state.location.search).toEqual({})
		expect(
			queryClient.getQueryData(['educare-api', 'criancas']),
		).toBeUndefined()
	})
})
