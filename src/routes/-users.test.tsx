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
	createUser,
	deleteUser,
	getCurrentUser,
	getUsers,
	resetUserPassword,
	updateUser,
} from '#/integrations/educare-api/functions'
import { messages } from '#/integrations/educare-api/messages'
import type { User } from '#/integrations/educare-api/users'
import { attach, renderRoutes } from '#/testing/render-route'
import { Route as AuthenticatedRoute } from './_authenticated'
import { Route as SettingsRoute } from './_authenticated/configuracoes'
import { Route as UsersTabRoute } from './_authenticated/configuracoes/usuarios'

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
const listMock = vi.mocked(getUsers)
const createMock = vi.mocked(createUser)
const updateMock = vi.mocked(updateUser)
const resetMock = vi.mocked(resetUserPassword)
const deleteMock = vi.mocked(deleteUser)

const PAGE_SIZE = 20

function user(name: string, role = 'EDUCADOR', id = name): User {
	const login = `${name.toLowerCase().replace(/\s+/g, '.')}@educare.org`
	return { id, name, login, role, createdAt: '2026-03-20T13:00:00Z' }
}

const ana: User = {
	...user('Ana Souza', 'COORDENADOR', '1'),
	createdAt: '2026-03-12T14:00:00Z',
}
const carlos = user('Carlos Lima')

/** Usuários "na API": a lista é paginada a partir daqui, por nome. */
let db: User[] = []

/** A página `page` (começando em 1) dos usuários de `db`, como a API. */
function listing(page: number) {
	const sorted = [...db].sort((a, b) => a.name.localeCompare(b.name))
	const number = page - 1
	return {
		ok: true as const,
		users: sorted.slice(number * PAGE_SIZE, (number + 1) * PAGE_SIZE),
		page: {
			number,
			size: PAGE_SIZE,
			totalElements: sorted.length,
			totalPages: Math.ceil(sorted.length / PAGE_SIZE),
		},
	}
}

function serveList() {
	listMock.mockImplementation((async ({ data }: { data: { page: number } }) =>
		listing(data.page)) as never)
}

function session(me: User) {
	sessionMock.mockResolvedValue({
		user: { ...me, updatedAt: me.createdAt },
		expired: false,
	} as never)
}

async function open(url = '/configuracoes/usuarios', users = [ana, carlos]) {
	db = [...users]
	serveList()
	session(ana)
	render(<Toaster />)
	return renderRoutes(url, (root) => {
		const layout = attach(AuthenticatedRoute, root, { id: '/_authenticated' })
		const settings = attach(SettingsRoute, layout, {
			id: '/configuracoes',
			path: '/configuracoes',
		})
		return [
			layout.addChildren([
				settings.addChildren([
					attach(UsersTabRoute, settings, {
						id: '/usuarios',
						path: '/usuarios',
					}),
				]),
			]),
		]
	})
}

type Screen = Awaited<ReturnType<typeof open>>['screen']

async function table(screen: Screen) {
	return within(await screen.findByRole('table', { name: 'Usuários' }))
}

async function rowOf(screen: Screen, name: string) {
	const cell = (await table(screen)).getByText(name)
	return within(cell.closest('tr') as HTMLElement)
}

/** A tabela atrás de um modal aberto (o Radix a esconde dos leitores de tela). */
function tableBehindDialog(screen: Screen) {
	return within(screen.getByRole('table', { name: 'Usuários', hidden: true }))
}

async function openDialog(screen: Screen, button: string, title: string) {
	const trigger =
		button === 'Novo usuário'
			? screen.getByRole('button', { name: 'Novo usuário' })
			: (await table(screen)).getByRole('button', { name: button })
	fireEvent.click(trigger)
	return within(await screen.findByRole('dialog', { name: title }))
}

type Dialog = Awaited<ReturnType<typeof openDialog>>

function type(dialog: Dialog, label: string, value: string) {
	fireEvent.change(dialog.getByLabelText(label), { target: { value } })
}

async function chooseRole(screen: Screen, dialog: Dialog, label: string) {
	fireEvent.keyDown(dialog.getByRole('combobox', { name: 'Função' }), {
		key: 'ArrowDown',
	})
	fireEvent.click(await screen.findByRole('option', { name: label }))
}

function submit(dialog: Dialog, name: string) {
	fireEvent.click(dialog.getByRole('button', { name }))
}

/** Uma promessa que o teste resolve quando quiser. */
function deferred<T>() {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((r) => {
		resolve = r
	})
	return { promise, resolve }
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
	// O jsdom não tem o que o Select do Radix usa para abrir a lista.
	Element.prototype.scrollIntoView = vi.fn()
	Element.prototype.hasPointerCapture = vi.fn(() => false)
	Element.prototype.releasePointerCapture = vi.fn()
})

afterEach(() => {
	cleanup()
	toast.dismiss()
	vi.clearAllMocks()
	vi.unstubAllGlobals()
})

describe('lista de usuários', () => {
	it('mostra a tabela com função, data e o selo Você', async () => {
		const { screen } = await open()
		const rows = await table(screen)

		expect(rows.getByText('Ana Souza')).toBeDefined()
		expect(rows.getByText('Você')).toBeDefined()
		expect(rows.getByText('Coordenador(a)')).toBeDefined()
		expect(rows.getByText('12/03/2026')).toBeDefined()
		expect(rows.getByText('Carlos Lima')).toBeDefined()
		expect(rows.getByText('Educador(a)')).toBeDefined()
		expect(rows.getByText('carlos.lima@educare.org')).toBeDefined()
		expect(
			rows.getAllByRole('columnheader').map((cell) => cell.textContent),
		).toEqual(['Nome', 'Email', 'Função', 'Criado em', 'Ações'])
		expect(screen.getByText('2 pessoas com acesso ao sistema')).toBeDefined()
	})

	it('na própria linha só há Editar', async () => {
		const { screen } = await open()
		const self = await rowOf(screen, 'Ana Souza')
		expect(self.getByRole('button', { name: 'Editar Ana Souza' })).toBeDefined()
		expect(
			self.queryByRole('button', { name: 'Redefinir a senha de Ana Souza' }),
		).toBeNull()
		expect(self.queryByRole('button', { name: 'Excluir Ana Souza' })).toBeNull()

		const other = await rowOf(screen, 'Carlos Lima')
		for (const name of [
			'Editar Carlos Lima',
			'Redefinir a senha de Carlos Lima',
			'Excluir Carlos Lima',
		]) {
			expect(other.getByRole('button', { name })).toBeDefined()
		}
	})

	it('tem os cards para o celular', async () => {
		const { screen } = await open()
		await table(screen)
		const cards = within(screen.getByRole('list', { name: 'Usuários' }))
		expect(cards.getByText('Carlos Lima')).toBeDefined()
		expect(cards.getByText('carlos.lima@educare.org')).toBeDefined()
		expect(cards.getByText('Educador(a)')).toBeDefined()
		expect(cards.getByText('Você')).toBeDefined()
	})

	it('usa o singular com uma pessoa', async () => {
		const { screen } = await open('/configuracoes/usuarios', [ana])
		expect(
			await screen.findByText('1 pessoa com acesso ao sistema'),
		).toBeDefined()
	})

	it('mostra o carregamento sem subtítulo nem paginação', async () => {
		db = [ana]
		listMock.mockImplementation(() => new Promise(() => {}))
		session(ana)
		const { screen } = await renderRoutes('/configuracoes/usuarios', (root) => {
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
						attach(UsersTabRoute, settings, {
							id: '/usuarios',
							path: '/usuarios',
						}),
					]),
				]),
			]
		})
		expect(await screen.findAllByTestId('user-skeleton')).toHaveLength(3)
		expect(screen.queryByText(/com acesso ao sistema/)).toBeNull()
		expect(screen.queryByText(/^Mostrando/)).toBeNull()
	})

	it('mostra o erro e busca de novo com Tentar de novo', async () => {
		let fail = true
		db = [ana, carlos]
		listMock.mockImplementation((async ({
			data,
		}: {
			data: { page: number }
		}) =>
			fail
				? { ok: false, message: messages.unavailable }
				: listing(data.page)) as never)
		session(ana)
		render(<Toaster />)
		const { screen } = await renderRoutes('/configuracoes/usuarios', (root) => {
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
						attach(UsersTabRoute, settings, {
							id: '/usuarios',
							path: '/usuarios',
						}),
					]),
				]),
			]
		})
		expect(await screen.findByText(messages.unavailable)).toBeDefined()
		fail = false
		fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
		expect(await table(screen)).toBeDefined()
		expect(screen.queryByText(messages.unavailable)).toBeNull()
	})
})

describe('paginação', () => {
	const many = [
		ana,
		...Array.from({ length: 24 }, (_, i) =>
			user(`Pessoa ${String(i + 1).padStart(2, '0')}`),
		),
	]

	it('com uma página só, os dois botões ficam desabilitados', async () => {
		const { screen } = await open()
		expect(await screen.findByText('Mostrando 1–2 de 2')).toBeDefined()
		expect(
			(screen.getByRole('button', { name: 'Anterior' }) as HTMLButtonElement)
				.disabled,
		).toBe(true)
		expect(
			(screen.getByRole('button', { name: 'Próxima' }) as HTMLButtonElement)
				.disabled,
		).toBe(true)
	})

	it('Próxima vai para ?pagina=2', async () => {
		const { screen, router } = await open('/configuracoes/usuarios', many)
		expect(await screen.findByText('Mostrando 1–20 de 25')).toBeDefined()
		fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))

		expect(await screen.findByText('Mostrando 21–25 de 25')).toBeDefined()
		expect(router.state.location.href).toBe('/configuracoes/usuarios?pagina=2')
		await waitFor(() =>
			expect(
				(screen.getByRole('button', { name: 'Próxima' }) as HTMLButtonElement)
					.disabled,
			).toBe(true),
		)
		expect(listMock).toHaveBeenLastCalledWith({ data: { page: 2 } })
	})

	it('uma página além da última leva à última, sem ficar no histórico', async () => {
		const { screen, router } = await open('/configuracoes/usuarios?pagina=9')
		expect(await screen.findByText('Mostrando 1–2 de 2')).toBeDefined()
		expect(router.state.location.href).toBe('/configuracoes/usuarios')
		expect(router.history.length).toBe(1)
	})

	it('um valor inválido vale a página 1', async () => {
		const { screen } = await open('/configuracoes/usuarios?pagina=abc')
		expect(await screen.findByText('Mostrando 1–2 de 2')).toBeDefined()
		expect(listMock).toHaveBeenCalledWith({ data: { page: 1 } })
	})
})

describe('novo usuário', () => {
	it('abre com o foco em Nome e Educador(a) escolhido', async () => {
		const { screen } = await open()
		await table(screen)
		const dialog = await openDialog(screen, 'Novo usuário', 'Novo usuário')

		expect(
			dialog.getByText(
				'A pessoa entra no sistema com este email e a senha definida aqui.',
			),
		).toBeDefined()
		expect(document.activeElement).toBe(dialog.getByLabelText('Nome'))
		expect(
			dialog.getByRole('combobox', { name: 'Função' }).textContent,
		).toContain('Educador(a)')
		expect(
			dialog.getByText('Coordenadores(as) também acessam as configurações.'),
		).toBeDefined()
		expect(dialog.getByPlaceholderText('Senha inicial')).toBeDefined()
	})

	it('cria um(a) educador(a)', async () => {
		createMock.mockImplementation((async ({ data }: { data: User }) => {
			db.push(user(data.name, data.role))
			return { ok: true }
		}) as never)
		const { screen } = await open()
		await table(screen)
		const dialog = await openDialog(screen, 'Novo usuário', 'Novo usuário')
		type(dialog, 'Nome', '  Mariana Alves ')
		type(dialog, 'Email', 'mariana.alves@educare.org')
		type(dialog, 'Senha', 'senha-forte-1')
		submit(dialog, 'Criar usuário')

		expect(await screen.findByText(messages.userCreated)).toBeDefined()
		expect(createMock).toHaveBeenCalledWith({
			data: {
				name: 'Mariana Alves',
				login: 'mariana.alves@educare.org',
				password: 'senha-forte-1',
				role: 'EDUCADOR',
			},
		})
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: 'Novo usuário' })).toBeNull(),
		)
		const row = await rowOf(screen, 'Mariana Alves')
		expect(row.getByText('Educador(a)')).toBeDefined()
	})

	it('cria um(a) coordenador(a) escolhendo a função', async () => {
		createMock.mockResolvedValue({ ok: true } as never)
		const { screen } = await open()
		await table(screen)
		const dialog = await openDialog(screen, 'Novo usuário', 'Novo usuário')
		type(dialog, 'Nome', 'Beatriz Rocha')
		type(dialog, 'Email', 'beatriz.rocha@educare.org')
		type(dialog, 'Senha', 'senha-forte-1')
		await chooseRole(screen, dialog, 'Coordenador(a)')
		submit(dialog, 'Criar usuário')

		await waitFor(() =>
			expect(createMock).toHaveBeenCalledWith({
				data: expect.objectContaining({ role: 'COORDENADOR' }),
			}),
		)
	})

	it('valida antes de enviar', async () => {
		const { screen } = await open()
		await table(screen)
		const dialog = await openDialog(screen, 'Novo usuário', 'Novo usuário')
		type(dialog, 'Email', 'carlos')
		type(dialog, 'Senha', 'curta12')
		submit(dialog, 'Criar usuário')

		expect(await dialog.findByText('Informe o nome.')).toBeDefined()
		expect(dialog.getByText('Informe um email válido.')).toBeDefined()
		expect(dialog.getByText('Use pelo menos 8 caracteres.')).toBeDefined()
		const email = dialog.getByLabelText('Email')
		expect(email.getAttribute('aria-invalid')).toBe('true')
		expect(email.getAttribute('aria-describedby')).toBe(
			dialog.getByText('Informe um email válido.').id,
		)
		expect(createMock).not.toHaveBeenCalled()
	})

	it('email duplicado fica no campo Email, com o modal aberto', async () => {
		createMock.mockResolvedValue({
			ok: false,
			kind: 'conflict',
			fieldErrors: { login: messages.userEmailTaken },
		} as never)
		const { screen } = await open()
		await table(screen)
		const dialog = await openDialog(screen, 'Novo usuário', 'Novo usuário')
		type(dialog, 'Nome', 'Carlos Lima')
		type(dialog, 'Email', 'carlos.lima@educare.org')
		type(dialog, 'Senha', 'senha-forte-1')
		submit(dialog, 'Criar usuário')

		expect(await dialog.findByText(messages.userEmailTaken)).toBeDefined()
		expect(screen.getByRole('dialog', { name: 'Novo usuário' })).toBeDefined()

		type(dialog, 'Email', 'carlos.lima2@educare.org')
		expect(dialog.queryByText(messages.userEmailTaken)).toBeNull()
	})

	it('durante o envio, os botões ficam desabilitados e Esc não fecha', async () => {
		const reply = deferred<never>()
		createMock.mockReturnValue(reply.promise)
		const { screen } = await open()
		await table(screen)
		const dialog = await openDialog(screen, 'Novo usuário', 'Novo usuário')
		type(dialog, 'Nome', 'Mariana Alves')
		type(dialog, 'Email', 'mariana.alves@educare.org')
		type(dialog, 'Senha', 'senha-forte-1')
		submit(dialog, 'Criar usuário')

		await waitFor(() =>
			expect(
				(
					dialog.getByRole('button', {
						name: 'Criar usuário',
					}) as HTMLButtonElement
				).disabled,
			).toBe(true),
		)
		expect(
			(dialog.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement)
				.disabled,
		).toBe(true)
		fireEvent.keyDown(document.activeElement ?? document.body, {
			key: 'Escape',
		})
		expect(screen.getByRole('dialog', { name: 'Novo usuário' })).toBeDefined()
		reply.resolve({ ok: true } as never)
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: 'Novo usuário' })).toBeNull(),
		)
	})

	it('Esc descarta o que foi digitado e devolve o foco ao botão', async () => {
		const { screen } = await open()
		await table(screen)
		let dialog = await openDialog(screen, 'Novo usuário', 'Novo usuário')
		type(dialog, 'Nome', 'Mariana')
		fireEvent.keyDown(dialog.getByLabelText('Nome'), { key: 'Escape' })
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: 'Novo usuário' })).toBeNull(),
		)
		expect(document.activeElement).toBe(
			screen.getByRole('button', { name: 'Novo usuário' }),
		)

		dialog = await openDialog(screen, 'Novo usuário', 'Novo usuário')
		expect((dialog.getByLabelText('Nome') as HTMLInputElement).value).toBe('')
	})
})

describe('editar usuário', () => {
	it('abre preenchido, sem senha', async () => {
		const { screen } = await open()
		const dialog = await openDialog(
			screen,
			'Editar Carlos Lima',
			'Editar usuário',
		)
		expect(
			dialog.getByText('Altere o nome, o email de acesso ou a função.'),
		).toBeDefined()
		expect((dialog.getByLabelText('Nome') as HTMLInputElement).value).toBe(
			'Carlos Lima',
		)
		expect((dialog.getByLabelText('Email') as HTMLInputElement).value).toBe(
			'carlos.lima@educare.org',
		)
		expect(
			dialog.getByRole('combobox', { name: 'Função' }).textContent,
		).toContain('Educador(a)')
		expect(dialog.queryByLabelText('Senha')).toBeNull()
		expect(
			dialog.getByText(
				'Para trocar a senha, use “Redefinir senha” na lista de usuários.',
			),
		).toBeDefined()
	})

	it('salva e envia os dados de antes para entender um conflito', async () => {
		updateMock.mockImplementation((async ({ data }: { data: User }) => {
			db = db.map((u) => (u.id === data.id ? { ...u, name: data.name } : u))
			return { ok: true }
		}) as never)
		const { screen } = await open()
		const dialog = await openDialog(
			screen,
			'Editar Carlos Lima',
			'Editar usuário',
		)
		type(dialog, 'Nome', 'Carlos Lima Filho')
		submit(dialog, 'Salvar alterações')

		expect(await screen.findByText(messages.userUpdated)).toBeDefined()
		expect(updateMock).toHaveBeenCalledWith({
			data: {
				id: carlos.id,
				name: 'Carlos Lima Filho',
				login: 'carlos.lima@educare.org',
				role: 'EDUCADOR',
				currentRole: 'EDUCADOR',
				currentLogin: 'carlos.lima@educare.org',
			},
		})
		expect(await rowOf(screen, 'Carlos Lima Filho')).toBeDefined()
	})

	it('último coordenador: o modal continua aberto com o alerta', async () => {
		updateMock.mockResolvedValue({
			ok: false,
			kind: 'conflict',
			message: messages.lastCoordinator,
			fieldErrors: {},
		} as never)
		const beatriz = user('Beatriz Rocha', 'COORDENADOR')
		const { screen } = await open('/configuracoes/usuarios', [
			ana,
			beatriz,
			carlos,
		])
		const dialog = await openDialog(
			screen,
			'Editar Beatriz Rocha',
			'Editar usuário',
		)
		await chooseRole(screen, dialog, 'Educador(a)')
		submit(dialog, 'Salvar alterações')

		expect(await dialog.findByText(messages.lastCoordinator)).toBeDefined()
		expect(screen.getByRole('dialog', { name: 'Editar usuário' })).toBeDefined()
		const row = within(
			tableBehindDialog(screen)
				.getByText('Beatriz Rocha')
				.closest('tr') as HTMLElement,
		)
		expect(row.getByText('Coordenador(a)')).toBeDefined()
	})

	it('quem se rebaixa a Educador(a) sai de Configurações', async () => {
		updateMock.mockImplementation((async () => {
			session({ ...ana, role: 'EDUCADOR' })
			return { ok: true }
		}) as never)
		const { screen, router } = await open('/configuracoes/usuarios', [
			ana,
			user('Beatriz Rocha', 'COORDENADOR'),
		])
		const dialog = await openDialog(
			screen,
			'Editar Ana Souza',
			'Editar usuário',
		)
		await chooseRole(screen, dialog, 'Educador(a)')
		submit(dialog, 'Salvar alterações')

		await waitFor(() => expect(router.state.location.pathname).toBe('/'))
		expect(await screen.findByText('Página inicial')).toBeDefined()
		expect(screen.queryByRole('link', { name: 'Configurações' })).toBeNull()
	})

	it('usuário excluído por outra pessoa: fecha e atualiza a lista', async () => {
		updateMock.mockImplementation((async () => {
			db = db.filter((u) => u.id !== carlos.id)
			return { ok: false, kind: 'not-found', fieldErrors: {} }
		}) as never)
		const { screen } = await open()
		const dialog = await openDialog(
			screen,
			'Editar Carlos Lima',
			'Editar usuário',
		)
		submit(dialog, 'Salvar alterações')

		expect(await screen.findByText(messages.userNotFound)).toBeDefined()
		await waitFor(() =>
			expect(
				screen.queryByRole('dialog', { name: 'Editar usuário' }),
			).toBeNull(),
		)
		await waitFor(async () =>
			expect((await table(screen)).queryByText('Carlos Lima')).toBeNull(),
		)
		expect(document.activeElement).toBe(
			screen.getByRole('button', { name: 'Novo usuário' }),
		)
	})

	it('outros erros aparecem num alerta dentro do modal', async () => {
		updateMock.mockResolvedValue({
			ok: false,
			kind: 'unavailable',
			message: messages.unavailable,
			fieldErrors: {},
		} as never)
		const { screen } = await open()
		const dialog = await openDialog(
			screen,
			'Editar Carlos Lima',
			'Editar usuário',
		)
		submit(dialog, 'Salvar alterações')
		expect(await dialog.findByText(messages.unavailable)).toBeDefined()
	})
})

describe('redefinir senha', () => {
	it('mostra a pessoa e foca em Nova senha', async () => {
		const { screen } = await open()
		const dialog = await openDialog(
			screen,
			'Redefinir a senha de Carlos Lima',
			'Redefinir senha',
		)
		expect(
			dialog.getByText(
				'A senha atual deixa de funcionar. Avise a pessoa da nova senha.',
			),
		).toBeDefined()
		expect(dialog.getByText('carlos.lima@educare.org')).toBeDefined()
		expect(document.activeElement).toBe(dialog.getByLabelText('Nova senha'))
	})

	it('senhas diferentes não são enviadas', async () => {
		const { screen } = await open()
		const dialog = await openDialog(
			screen,
			'Redefinir a senha de Carlos Lima',
			'Redefinir senha',
		)
		type(dialog, 'Nova senha', 'senha-forte-1')
		type(dialog, 'Confirmar nova senha', 'senha-forte-2')
		submit(dialog, 'Salvar nova senha')

		expect(await dialog.findByText('As senhas não conferem.')).toBeDefined()
		expect(resetMock).not.toHaveBeenCalled()
	})

	it('senha curta não é enviada', async () => {
		const { screen } = await open()
		const dialog = await openDialog(
			screen,
			'Redefinir a senha de Carlos Lima',
			'Redefinir senha',
		)
		type(dialog, 'Nova senha', 'curta12')
		type(dialog, 'Confirmar nova senha', 'curta12')
		submit(dialog, 'Salvar nova senha')

		expect(
			await dialog.findByText('Use pelo menos 8 caracteres.'),
		).toBeDefined()
		expect(resetMock).not.toHaveBeenCalled()
	})

	it('redefine e avisa', async () => {
		resetMock.mockResolvedValue({ ok: true } as never)
		const { screen } = await open()
		const dialog = await openDialog(
			screen,
			'Redefinir a senha de Carlos Lima',
			'Redefinir senha',
		)
		type(dialog, 'Nova senha', 'senha-forte-1')
		type(dialog, 'Confirmar nova senha', 'senha-forte-1')
		submit(dialog, 'Salvar nova senha')

		expect(await screen.findByText(messages.userPasswordReset)).toBeDefined()
		expect(resetMock).toHaveBeenCalledWith({
			data: {
				id: carlos.id,
				newPassword: 'senha-forte-1',
				confirmPassword: 'senha-forte-1',
			},
		})
		await waitFor(() =>
			expect(
				screen.queryByRole('dialog', { name: 'Redefinir senha' }),
			).toBeNull(),
		)
		expect(document.activeElement).toBe(
			(await table(screen)).getByRole('button', {
				name: 'Redefinir a senha de Carlos Lima',
			}),
		)
	})
})

describe('excluir usuário', () => {
	it('confirma antes de excluir', async () => {
		deleteMock.mockImplementation((async ({
			data,
		}: {
			data: { id: string }
		}) => {
			db = db.filter((u) => u.id !== data.id)
			return { ok: true }
		}) as never)
		const { screen } = await open()
		const dialog = await openDialog(
			screen,
			'Excluir Carlos Lima',
			'Excluir Carlos Lima?',
		)
		expect(
			dialog.getByText(
				'Carlos Lima (carlos.lima@educare.org) perde o acesso ao sistema.',
			),
		).toBeDefined()
		expect(dialog.getByText('Essa ação não pode ser desfeita.')).toBeDefined()
		expect(document.activeElement).toBe(
			dialog.getByRole('button', { name: 'Cancelar' }),
		)
		expect(deleteMock).not.toHaveBeenCalled()
		submit(dialog, 'Excluir usuário')

		expect(await screen.findByText(messages.userDeleted)).toBeDefined()
		await waitFor(async () =>
			expect((await table(screen)).queryByText('Carlos Lima')).toBeNull(),
		)
	})

	it('cancelar não exclui', async () => {
		const { screen } = await open()
		const dialog = await openDialog(
			screen,
			'Excluir Carlos Lima',
			'Excluir Carlos Lima?',
		)
		submit(dialog, 'Cancelar')
		await waitFor(() =>
			expect(
				screen.queryByRole('dialog', { name: 'Excluir Carlos Lima?' }),
			).toBeNull(),
		)
		expect(deleteMock).not.toHaveBeenCalled()
		expect((await table(screen)).getByText('Carlos Lima')).toBeDefined()
	})

	it('último coordenador: o modal continua aberto', async () => {
		deleteMock.mockResolvedValue({
			ok: false,
			kind: 'conflict',
			message: messages.lastCoordinator,
			fieldErrors: {},
		} as never)
		const beatriz = user('Beatriz Rocha', 'COORDENADOR')
		const { screen } = await open('/configuracoes/usuarios', [ana, beatriz])
		const dialog = await openDialog(
			screen,
			'Excluir Beatriz Rocha',
			'Excluir Beatriz Rocha?',
		)
		submit(dialog, 'Excluir usuário')

		expect(await dialog.findByText(messages.lastCoordinator)).toBeDefined()
		expect(
			screen.getByRole('dialog', { name: 'Excluir Beatriz Rocha?' }),
		).toBeDefined()
		expect(tableBehindDialog(screen).getByText('Beatriz Rocha')).toBeDefined()
	})

	it('excluir o último da página volta para a anterior', async () => {
		const many = [
			ana,
			...Array.from({ length: 20 }, (_, i) =>
				user(`Pessoa ${String(i + 1).padStart(2, '0')}`),
			),
		]
		deleteMock.mockImplementation((async ({
			data,
		}: {
			data: { id: string }
		}) => {
			db = db.filter((u) => u.id !== data.id)
			return { ok: true }
		}) as never)
		const { screen, router } = await open(
			'/configuracoes/usuarios?pagina=2',
			many,
		)
		expect(await screen.findByText('Mostrando 21–21 de 21')).toBeDefined()
		const dialog = await openDialog(
			screen,
			'Excluir Pessoa 20',
			'Excluir Pessoa 20?',
		)
		submit(dialog, 'Excluir usuário')

		expect(await screen.findByText('Mostrando 1–20 de 20')).toBeDefined()
		expect(router.state.location.href).toBe('/configuracoes/usuarios')
	})
})
