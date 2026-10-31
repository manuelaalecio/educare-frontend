import { cleanup, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser, login } from '#/integrations/educare-api/functions'
import { messages } from '#/integrations/educare-api/messages'
import { attach, renderRoutes } from '#/testing/render-route'
import { Route } from './login'

vi.mock('#/integrations/educare-api/functions', () => ({
	login: vi.fn(),
	logout: vi.fn(),
	getCurrentUser: vi.fn(),
}))

vi.mock('@tanstack/react-start', async (importOriginal) => ({
	...(await importOriginal<typeof import('@tanstack/react-start')>()),
	useServerFn: (fn: unknown) => fn,
}))

const loginMock = vi.mocked(login)
const sessionMock = vi.mocked(getCurrentUser)

function open(url: string) {
	return renderRoutes(url, (root) => [
		attach(Route, root, { id: '/login', path: '/login' }),
	])
}

function fillAndSubmit(
	screen: Awaited<ReturnType<typeof open>>['screen'],
	email: string,
	password: string,
) {
	fireEvent.change(screen.getByLabelText('Email'), {
		target: { value: email },
	})
	fireEvent.change(screen.getByLabelText('Senha'), {
		target: { value: password },
	})
	fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

beforeEach(() => {
	sessionMock.mockResolvedValue({ user: null, expired: false } as never)
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

describe('/login', () => {
	it('tem o título "Entrar · Educare"', () => {
		expect(Route.options.head?.({} as never)).toEqual({
			meta: [{ title: 'Entrar · Educare' }],
		})
	})

	it('leva ao destino pedido depois do login', async () => {
		loginMock.mockResolvedValue({ ok: true } as never)
		const { screen, router } = await open('/login?redirect=%2Fminha-conta')
		fillAndSubmit(screen, 'ana.souza@educare.org', 'segredo123')

		expect(await screen.findByText('Página Minha conta')).toBeDefined()
		expect(router.state.location.pathname).toBe('/minha-conta')
		expect(loginMock).toHaveBeenCalledWith({
			data: { login: 'ana.souza@educare.org', password: 'segredo123' },
		})
	})

	it('leva a / com um redirect externo', async () => {
		loginMock.mockResolvedValue({ ok: true } as never)
		const { screen } = await open(
			'/login?redirect=https%3A%2F%2Fmalicioso.example',
		)
		fillAndSubmit(screen, 'ana.souza@educare.org', 'segredo123')

		expect(await screen.findByText('Página inicial')).toBeDefined()
	})

	it('mostra credenciais inválidas e limpa só a senha', async () => {
		loginMock.mockResolvedValue({
			ok: false,
			kind: 'invalid-credentials',
			message: messages.invalidCredentials,
			fieldErrors: {},
		} as never)
		const { screen, router } = await open('/login')
		fillAndSubmit(screen, 'ana.souza@educare.org', 'errada123')

		expect((await screen.findByRole('alert')).textContent).toBe(
			messages.invalidCredentials,
		)
		expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe(
			'ana.souza@educare.org',
		)
		expect((screen.getByLabelText('Senha') as HTMLInputElement).value).toBe('')
		expect(router.state.location.pathname).toBe('/login')
	})

	it('mostra o erro de campo vindo da API junto a Senha', async () => {
		loginMock.mockResolvedValue({
			ok: false,
			kind: 'validation',
			fieldErrors: { password: 'é obrigatória' },
		} as never)
		const { screen } = await open('/login')
		fillAndSubmit(screen, 'ana.souza@educare.org', 'segredo123')

		await waitFor(() => {
			const id = screen.getByLabelText('Senha').getAttribute('aria-describedby')
			expect(id && document.getElementById(id)?.textContent).toBe(
				'é obrigatória',
			)
		})
	})

	it('mostra servidor indisponível', async () => {
		loginMock.mockResolvedValue({
			ok: false,
			kind: 'unavailable',
			message: messages.unavailable,
			fieldErrors: {},
		} as never)
		const { screen } = await open('/login')
		fillAndSubmit(screen, 'ana.souza@educare.org', 'segredo123')

		expect((await screen.findByRole('alert')).textContent).toBe(
			messages.unavailable,
		)
	})

	it('faz uma só requisição durante o envio', async () => {
		loginMock.mockReturnValue(new Promise(() => {}) as never)
		const { screen } = await open('/login')
		fillAndSubmit(screen, 'ana.souza@educare.org', 'segredo123')

		const button = screen.getByRole('button', { name: 'Entrar' })
		await waitFor(() => expect(button.hasAttribute('disabled')).toBe(true))
		fireEvent.click(button)
		expect(loginMock).toHaveBeenCalledTimes(1)
	})

	it('não chama a API com os campos inválidos', async () => {
		const { screen } = await open('/login')
		fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

		await waitFor(() =>
			expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe(
				'true',
			),
		)
		expect(loginMock).not.toHaveBeenCalled()
	})

	it('mostra o aviso de sessão expirada', async () => {
		const { screen } = await open('/login?redirect=%2F&motivo=sessao-expirada')
		expect(await screen.findByText(messages.sessionExpired)).toBeDefined()
	})

	it('não mostra o aviso sem o motivo', async () => {
		const { screen } = await open('/login')
		await screen.findByRole('button', { name: 'Entrar' })
		expect(screen.queryByText(messages.sessionExpired)).toBeNull()
	})

	it('leva a / quem já tem sessão', async () => {
		sessionMock.mockResolvedValue({
			user: { id: '1', name: 'Ana Souza', login: 'ana', role: 'USER' },
			expired: false,
		} as never)
		const { screen, router } = await open('/login')

		expect(await screen.findByText('Página inicial')).toBeDefined()
		expect(router.state.location.pathname).toBe('/')
	})

	it('tem o botão de tema no canto da página', async () => {
		const { screen } = await open('/login')
		const toggle = await screen.findByRole('button', {
			name: 'Usar tema escuro',
		})
		expect(toggle.className).toContain('fixed')
		expect(toggle.className).toContain('top-4')
		expect(toggle.className).toContain('right-4')
	})

	it('não tem a barra lateral', async () => {
		const { screen } = await open('/login')
		await screen.findByRole('button', { name: 'Entrar' })
		expect(
			screen.queryByRole('navigation', { name: 'Menu principal' }),
		).toBeNull()
	})
})
