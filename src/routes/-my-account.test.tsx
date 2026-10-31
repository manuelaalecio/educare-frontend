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
import {
	changeOwnPassword,
	getCurrentUser,
} from '#/integrations/educare-api/functions'
import { messages } from '#/integrations/educare-api/messages'
import { attach, renderRoutes } from '#/testing/render-route'
import { Route as AuthenticatedRoute } from './_authenticated'
import { Route as MyAccountRoute } from './_authenticated/minha-conta/index'

vi.mock('#/integrations/educare-api/functions', () => ({
	login: vi.fn(),
	logout: vi.fn(),
	getCurrentUser: vi.fn(),
	changeOwnPassword: vi.fn(),
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
const changeMock = vi.mocked(changeOwnPassword)

const ana = {
	id: '2',
	name: 'Ana Souza',
	login: 'ana.souza@educare.org',
	role: 'USER',
	createdAt: '2026-03-12T14:00:00Z',
}

async function open(user: typeof ana = ana) {
	sessionMock.mockResolvedValue({ user, expired: false } as never)
	render(<Toaster />)
	return renderRoutes('/minha-conta', (root) => {
		const layout = attach(AuthenticatedRoute, root, { id: '/_authenticated' })
		return [
			layout.addChildren([
				attach(MyAccountRoute, layout, {
					id: '/minha-conta/',
					path: '/minha-conta',
				}),
			]),
		]
	})
}

type Screen = Awaited<ReturnType<typeof open>>['screen']

async function openDialog(screen: Screen) {
	fireEvent.click(await screen.findByRole('button', { name: 'Alterar senha' }))
	return within(await screen.findByRole('dialog', { name: 'Alterar senha' }))
}

type Dialog = Awaited<ReturnType<typeof openDialog>>

const valid = {
	'Senha atual': 'segredo123',
	'Nova senha': 'novaSenha456',
	'Confirmar nova senha': 'novaSenha456',
}

function fill(dialog: Dialog, values: Record<string, string>) {
	for (const [label, value] of Object.entries(values)) {
		fireEvent.change(dialog.getByLabelText(label), { target: { value } })
	}
}

function submit(dialog: Dialog) {
	fireEvent.click(dialog.getByRole('button', { name: 'Alterar senha' }))
}

function describedBy(dialog: Dialog, label: string) {
	const ids = dialog.getByLabelText(label).getAttribute('aria-describedby')
	return (ids ?? '')
		.split(' ')
		.filter(Boolean)
		.map((id) => document.getElementById(id)?.textContent)
}

function failWith(result: Record<string, unknown>) {
	changeMock.mockResolvedValue({
		ok: false,
		fieldErrors: {},
		...result,
	} as never)
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
	// O estado do sonner é global: o toast de um teste não vaza para o outro.
	toast.dismiss()
	cleanup()
	vi.clearAllMocks()
	vi.unstubAllGlobals()
})

describe('/minha-conta', () => {
	it('mostra o perfil de um USER, só para leitura', async () => {
		const { screen } = await open()
		const profile = within(
			await screen.findByRole('region', { name: 'Ana Souza' }),
		)

		expect(
			screen.getByRole('heading', { level: 1, name: 'Minha conta' }),
		).toBeDefined()
		expect(screen.getByText('Seus dados de acesso ao Educare.')).toBeDefined()
		expect(profile.getByText('AS')).toBeDefined()
		expect(profile.getAllByText('Funcionário')).toHaveLength(2)
		expect(profile.getByText('ana.souza@educare.org')).toBeDefined()
		expect(profile.getByText('março de 2026')).toBeDefined()
		expect(
			profile.getByText(
				'Nome, email e função são alterados por um administrador, em Configurações.',
			),
		).toBeDefined()
		expect(profile.queryByRole('textbox')).toBeNull()
	})

	it('mostra a função e as iniciais de um ADMIN', async () => {
		const { screen } = await open({
			...ana,
			name: 'Administrador',
			login: 'admin@educare.org',
			role: 'ADMIN',
		})
		const profile = within(
			await screen.findByRole('region', { name: 'Administrador' }),
		)
		expect(profile.getByText('AD')).toBeDefined()
		expect(profile.getAllByText('Administrador').length).toBeGreaterThan(1)
	})

	it('mostra o card Senha sem campos de senha antes de abrir o modal', async () => {
		const { screen } = await open()
		const card = within(await screen.findByRole('region', { name: 'Senha' }))

		expect(
			card.getByText(
				'Troque sua senha se desconfiar de acesso indevido. Os outros dispositivos conectados à sua conta são desconectados.',
			),
		).toBeDefined()
		expect(card.getByRole('button', { name: 'Alterar senha' })).toBeDefined()
		expect(screen.queryByLabelText('Senha atual')).toBeNull()
	})
})

describe('modal Alterar senha', () => {
	it('abre com os campos vazios, o foco em Senha atual e a dica', async () => {
		const { screen } = await open()
		const dialog = await openDialog(screen)

		expect(
			dialog.getByText('Confirme sua senha atual e escolha uma nova.'),
		).toBeDefined()
		for (const label of Object.keys(valid)) {
			expect((dialog.getByLabelText(label) as HTMLInputElement).value).toBe('')
		}
		await waitFor(() =>
			expect(document.activeElement).toBe(dialog.getByLabelText('Senha atual')),
		)
		expect(describedBy(dialog, 'Nova senha')).toEqual([
			'De 8 a 72 caracteres, diferente da senha atual e do seu email.',
		])
		expect(
			dialog.getByText(
				'Você continua conectado aqui. Os outros dispositivos precisarão entrar de novo com a nova senha.',
			),
		).toBeDefined()
	})

	it('troca a senha, fecha o modal e avisa', async () => {
		changeMock.mockResolvedValue({ ok: true } as never)
		const { screen, router } = await open()
		const dialog = await openDialog(screen)
		fill(dialog, valid)
		submit(dialog)

		expect(await screen.findByText(messages.passwordChanged)).toBeDefined()
		expect(messages.passwordChanged).toBe(
			'Senha alterada. Outros dispositivos foram desconectados.',
		)
		expect(changeMock).toHaveBeenCalledWith({
			data: {
				currentPassword: 'segredo123',
				newPassword: 'novaSenha456',
				confirmPassword: 'novaSenha456',
			},
		})
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
		expect(router.state.location.pathname).toBe('/minha-conta')
	})

	it('mostra o erro da API junto a Senha atual e continua aberto', async () => {
		failWith({
			kind: 'validation',
			fieldErrors: { currentPassword: 'Senha atual incorreta.' },
		})
		const { screen } = await open()
		const dialog = await openDialog(screen)
		fill(dialog, { ...valid, 'Senha atual': 'errada123' })
		submit(dialog)

		await waitFor(() =>
			expect(describedBy(dialog, 'Senha atual')).toEqual([
				'Senha atual incorreta.',
			]),
		)
		expect(screen.getByRole('dialog')).toBeDefined()
		expect(screen.queryByText(messages.passwordChanged)).toBeNull()
	})

	it('mostra o erro da API junto a Nova senha, depois da dica', async () => {
		failWith({
			kind: 'validation',
			fieldErrors: { newPassword: 'deve ser diferente da senha atual' },
		})
		const { screen } = await open()
		const dialog = await openDialog(screen)
		fill(dialog, valid)
		submit(dialog)

		await waitFor(() =>
			expect(describedBy(dialog, 'Nova senha')).toEqual([
				'De 8 a 72 caracteres, diferente da senha atual e do seu email.',
				'deve ser diferente da senha atual',
			]),
		)
		expect(
			dialog.getByLabelText('Nova senha').getAttribute('aria-invalid'),
		).toBe('true')
	})

	it.each([
		['429', 'too-many-requests', messages.tooManyAttempts],
		['API indisponível', 'unavailable', messages.unavailable],
	])('mostra o alerta no %s e continua aberto', async (_, kind, message) => {
		failWith({ kind, message })
		const { screen } = await open()
		const dialog = await openDialog(screen)
		fill(dialog, valid)
		submit(dialog)

		expect((await dialog.findByRole('alert')).textContent).toBe(message)
		expect(screen.getByRole('dialog')).toBeDefined()
	})

	it('mostra a mensagem exata de muitas tentativas', () => {
		expect(messages.tooManyAttempts).toBe(
			'Muitas tentativas. Tente novamente em alguns minutos.',
		)
	})

	it('recusa a confirmação diferente sem chamar a API', async () => {
		const { screen } = await open()
		const dialog = await openDialog(screen)
		fill(dialog, { ...valid, 'Confirmar nova senha': 'novaSenha789' })
		submit(dialog)

		await waitFor(() =>
			expect(describedBy(dialog, 'Confirmar nova senha')[0]).toBeTruthy(),
		)
		expect(changeMock).not.toHaveBeenCalled()
	})

	it('recusa a nova senha curta sem chamar a API', async () => {
		const { screen } = await open()
		const dialog = await openDialog(screen)
		fill(dialog, {
			...valid,
			'Nova senha': 'curta',
			'Confirmar nova senha': 'curta',
		})
		submit(dialog)

		await waitFor(() =>
			expect(describedBy(dialog, 'Nova senha')).toHaveLength(2),
		)
		expect(changeMock).not.toHaveBeenCalled()
	})

	it('mostra e oculta a senha', async () => {
		const { screen } = await open()
		const dialog = await openDialog(screen)
		const input = dialog.getByLabelText('Nova senha') as HTMLInputElement
		fill(dialog, { 'Nova senha': 'novaSenha456' })

		expect(input.type).toBe('password')
		fireEvent.click(dialog.getByRole('button', { name: 'Mostrar nova senha' }))
		expect(input.type).toBe('text')
		fireEvent.click(dialog.getByRole('button', { name: 'Ocultar nova senha' }))
		expect(input.type).toBe('password')
		expect(
			dialog.getByRole('button', { name: 'Mostrar senha atual' }),
		).toBeDefined()
		expect(
			dialog.getByRole('button', { name: 'Mostrar confirmar nova senha' }),
		).toBeDefined()
	})

	it.each([
		[
			'Cancelar',
			(dialog: Dialog) =>
				fireEvent.click(dialog.getByRole('button', { name: 'Cancelar' })),
		],
		[
			'Esc',
			(dialog: Dialog) =>
				fireEvent.keyDown(dialog.getByLabelText('Senha atual'), {
					key: 'Escape',
				}),
		],
	])('fechar com %s descarta o que foi digitado', async (_, close) => {
		const { screen } = await open()
		const dialog = await openDialog(screen)
		fill(dialog, valid)
		close(dialog)

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
		const trigger = screen.getByRole('button', { name: 'Alterar senha' })
		await waitFor(() => expect(document.activeElement).toBe(trigger))
		expect(changeMock).not.toHaveBeenCalled()

		const reopened = await openDialog(screen)
		for (const label of Object.keys(valid)) {
			expect((reopened.getByLabelText(label) as HTMLInputElement).value).toBe(
				'',
			)
		}
	})

	it('durante o envio, desabilita os botões e não fecha com Esc', async () => {
		let finish: (value: unknown) => void = () => {}
		changeMock.mockReturnValue(
			new Promise((resolve) => {
				finish = resolve
			}) as never,
		)
		const { screen } = await open()
		const dialog = await openDialog(screen)
		fill(dialog, valid)
		submit(dialog)

		const button = dialog.getByRole('button', { name: 'Alterar senha' })
		await waitFor(() =>
			expect((button as HTMLButtonElement).disabled).toBe(true),
		)
		expect(
			(dialog.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement)
				.disabled,
		).toBe(true)
		submit(dialog)
		fireEvent.keyDown(dialog.getByLabelText('Senha atual'), { key: 'Escape' })

		expect(screen.getByRole('dialog')).toBeDefined()
		expect(changeMock).toHaveBeenCalledTimes(1)

		finish({ ok: true })
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	})
})
