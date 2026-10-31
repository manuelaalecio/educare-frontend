import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Toaster } from '#/components/ui/sonner'
import { changeOwnPassword } from '#/integrations/educare-api/functions'
import { messages } from '#/integrations/educare-api/messages'
import { attach, renderRoutes } from '#/testing/render-route'
import { Route } from './_authenticated/minha-conta/senha'

vi.mock('#/integrations/educare-api/functions', () => ({
	changeOwnPassword: vi.fn(),
	getCurrentUser: vi.fn(),
}))

vi.mock('@tanstack/react-start', async (importOriginal) => ({
	...(await importOriginal<typeof import('@tanstack/react-start')>()),
	useServerFn: (fn: unknown) => fn,
}))

const changeMock = vi.mocked(changeOwnPassword)

async function open() {
	render(<Toaster />)
	return renderRoutes('/minha-conta/senha', (root) => [
		attach(Route, root, {
			id: '/minha-conta/senha',
			path: '/minha-conta/senha',
		}),
	])
}

type Screen = Awaited<ReturnType<typeof open>>['screen']

function fill(screen: Screen, values: Record<string, string>) {
	for (const [label, value] of Object.entries(values)) {
		fireEvent.change(screen.getByLabelText(label), { target: { value } })
	}
	fireEvent.click(screen.getByRole('button', { name: 'Trocar senha' }))
}

function errorOf(screen: Screen, label: string) {
	const id = screen.getByLabelText(label).getAttribute('aria-describedby')
	return id ? document.getElementById(id)?.textContent : undefined
}

const valid = {
	'Senha atual': 'segredo123',
	'Nova senha': 'novaSenha456',
	'Confirme a nova senha': 'novaSenha456',
}

afterEach(() => {
	// O estado do sonner é global: o toast de um teste não vaza para o outro.
	toast.dismiss()
	cleanup()
	vi.clearAllMocks()
})

describe('/minha-conta/senha', () => {
	it('troca a senha, avisa e limpa os campos', async () => {
		changeMock.mockResolvedValue({ ok: true } as never)
		const { screen, router } = await open()
		fill(screen, valid)

		expect(await screen.findByText(messages.passwordChanged)).toBeDefined()
		expect(changeMock).toHaveBeenCalledWith({
			data: {
				currentPassword: 'segredo123',
				newPassword: 'novaSenha456',
				confirmPassword: 'novaSenha456',
			},
		})
		for (const label of Object.keys(valid)) {
			expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('')
		}
		expect(router.state.location.pathname).toBe('/minha-conta/senha')
	})

	it('mostra o erro da API junto a Senha atual', async () => {
		changeMock.mockResolvedValue({
			ok: false,
			kind: 'validation',
			fieldErrors: { currentPassword: 'está incorreta' },
		} as never)
		const { screen } = await open()
		fill(screen, { ...valid, 'Senha atual': 'errada123' })

		await waitFor(() =>
			expect(errorOf(screen, 'Senha atual')).toBe('está incorreta'),
		)
		expect(screen.queryByText(messages.passwordChanged)).toBeNull()
	})

	it('recusa a confirmação diferente sem chamar a API', async () => {
		const { screen } = await open()
		fill(screen, { ...valid, 'Confirme a nova senha': 'novaSenha789' })

		await waitFor(() =>
			expect(errorOf(screen, 'Confirme a nova senha')).toBeTruthy(),
		)
		expect(changeMock).not.toHaveBeenCalled()
	})

	it('recusa a nova senha curta sem chamar a API', async () => {
		const { screen } = await open()
		fill(screen, {
			...valid,
			'Nova senha': 'curta',
			'Confirme a nova senha': 'curta',
		})

		await waitFor(() => expect(errorOf(screen, 'Nova senha')).toBeTruthy())
		expect(changeMock).not.toHaveBeenCalled()
	})

	it('mostra sem permissão no 403 e continua na página', async () => {
		changeMock.mockResolvedValue({
			ok: false,
			kind: 'forbidden',
			message: messages.forbidden,
			fieldErrors: {},
		} as never)
		const { screen, router } = await open()
		fill(screen, valid)

		expect((await screen.findByRole('alert')).textContent).toBe(
			messages.forbidden,
		)
		expect(router.state.location.pathname).toBe('/minha-conta/senha')
	})
})
