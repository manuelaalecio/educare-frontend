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
import type { Classroom } from '#/integrations/educare-api/classrooms'
import {
	createClassroom,
	deleteClassroom,
	getClassrooms,
	getCurrentUser,
	renameClassroom,
} from '#/integrations/educare-api/functions'
import { messages } from '#/integrations/educare-api/messages'
import { attach, renderRoutes } from '#/testing/render-route'
import { Route as AuthenticatedRoute } from './_authenticated'
import { Route as SettingsRoute } from './_authenticated/configuracoes'
import { Route as ClassroomsTabRoute } from './_authenticated/configuracoes/turmas'

vi.mock('#/integrations/educare-api/functions', () => ({
	login: vi.fn(),
	logout: vi.fn(),
	getCurrentUser: vi.fn(),
	changeOwnPassword: vi.fn(),
	getClassrooms: vi.fn(),
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
const listMock = vi.mocked(getClassrooms)
const createMock = vi.mocked(createClassroom)
const renameMock = vi.mocked(renameClassroom)
const deleteMock = vi.mocked(deleteClassroom)

const admin = {
	id: '2',
	name: 'Administrador',
	login: 'admin@educare.org',
	role: 'COORDENADOR',
	createdAt: '2026-01-10T12:00:00Z',
}

function classroom(
	name: string,
	counts: Partial<Classroom> = {},
	id = `id-${name}`,
): Classroom {
	return {
		id,
		name,
		studentCount: 0,
		maleCount: 0,
		femaleCount: 0,
		createdAt: '2026-02-02T13:00:00Z',
		...counts,
	}
}

const turma1 = classroom('Turma 1')
const turma2 = classroom('Turma 2')

function listing(...classrooms: Classroom[]) {
	return { ok: true, classrooms } as never
}

/** Cada chamada a `getClassrooms` devolve o próximo resultado; o último se repete. */
function listReturns(...results: unknown[]) {
	let call = 0
	listMock.mockImplementation(async () => {
		const result = results[Math.min(call, results.length - 1)]
		call += 1
		return result as never
	})
}

async function open() {
	sessionMock.mockResolvedValue({ user: admin, expired: false } as never)
	render(<Toaster />)
	const result = await renderRoutes('/configuracoes/turmas', (root) => {
		const layout = attach(AuthenticatedRoute, root, { id: '/_authenticated' })
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
	return result.screen
}

type Screen = Awaited<ReturnType<typeof open>>

async function table(screen: Screen) {
	return within(await screen.findByRole('table', { name: 'Turmas' }))
}

function list(screen: Screen) {
	return within(screen.getByRole('list', { name: 'Turmas' }))
}

async function openDialog(screen: Screen, button: string, title: string) {
	const trigger =
		button === 'Nova turma'
			? screen.getByRole('button', { name: 'Nova turma' })
			: (await table(screen)).getByRole('button', { name: button })
	fireEvent.click(trigger)
	return within(await screen.findByRole('dialog', { name: title }))
}

type Dialog = Awaited<ReturnType<typeof openDialog>>

function typeName(dialog: Dialog, value: string) {
	fireEvent.change(dialog.getByLabelText('Nome da turma'), {
		target: { value },
	})
}

function describedBy(dialog: Dialog) {
	const ids = dialog
		.getByLabelText('Nome da turma')
		.getAttribute('aria-describedby')
	return (ids ?? '')
		.split(' ')
		.filter(Boolean)
		.map((id) => document.getElementById(id)?.textContent)
}

/** Nomes das linhas da tabela. Com um modal aberto, o resto da página fica
 * com `aria-hidden`, por isso a consulta inclui os elementos escondidos. */
function rowNames(screen: Screen) {
	return within(screen.getByRole('table', { name: 'Turmas', hidden: true }))
		.getAllByRole('row', { hidden: true })
		.slice(1)
		.map(
			(row) =>
				within(row).getAllByRole('cell', { hidden: true })[0].textContent,
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
	toast.dismiss()
	cleanup()
	vi.clearAllMocks()
	vi.unstubAllGlobals()
})

describe('lista de turmas', () => {
	it('mostra as turmas na ordem da API, com contagens, data e subtítulo', async () => {
		listReturns(listing(turma1, turma2))
		const screen = await open()
		const rows = (await table(screen)).getAllByRole('row')

		expect(
			within(rows[0])
				.getAllByRole('columnheader')
				.map((cell) => cell.textContent),
		).toEqual(['Nome', 'Alunos', 'Meninos', 'Meninas', 'Criada em', 'Ações'])
		expect(
			within(rows[1])
				.getAllByRole('cell')
				.slice(0, 5)
				.map((cell) => cell.textContent),
		).toEqual(['Turma 1', '0', '0', '0', '02/02/2026'])
		expect(rowNames(screen)).toEqual(['Turma 1', 'Turma 2'])
		expect(
			screen.getByText(
				'2 turmas cadastradas. Elas aparecem nos gráficos do Início.',
			),
		).toBeDefined()
		expect(
			screen.getByRole('heading', { level: 2, name: 'Turmas' }),
		).toBeDefined()
		expect(ClassroomsTabRoute.options.head?.({} as never)).toEqual({
			meta: [{ title: 'Turmas · Configurações · Educare' }],
		})
	})

	it('usa o singular com uma turma só', async () => {
		listReturns(listing(turma1))
		const screen = await open()
		expect(
			await screen.findByText(
				'1 turma cadastrada. Elas aparecem nos gráficos do Início.',
			),
		).toBeDefined()
	})

	it('mostra a lista do celular com o resumo e as ações', async () => {
		listReturns(
			listing(
				classroom('Turma 1', {
					studentCount: 38,
					maleCount: 20,
					femaleCount: 18,
				}),
				classroom('Turma 2', { studentCount: 1, maleCount: 1, femaleCount: 0 }),
			),
		)
		const screen = await open()
		await table(screen)
		const mobile = list(screen)

		expect(
			mobile.getByText('38 alunos · 20 meninos e 18 meninas'),
		).toBeDefined()
		expect(mobile.getByText('1 aluno · 1 menino e 0 meninas')).toBeDefined()
		expect(mobile.getByRole('button', { name: 'Editar Turma 1' })).toBeDefined()
		expect(
			mobile.getByRole('button', { name: 'Excluir Turma 1' }),
		).toBeDefined()
		// Tabela e lista são escolhidas por CSS (md:).
		expect(
			screen.getByRole('table', { name: 'Turmas' }).closest('.hidden'),
		).not.toBeNull()
		expect(screen.getByRole('list', { name: 'Turmas' }).className).toContain(
			'md:hidden',
		)
	})

	it('mostra o carregamento sem subtítulo enquanto a busca não termina', async () => {
		listMock.mockReturnValue(new Promise(() => {}))
		const screen = await open()

		expect(
			(await screen.findAllByTestId('classroom-skeleton')).length,
		).toBeGreaterThan(0)
		expect(screen.queryByText(/turmas? cadastradas?/)).toBeNull()
		expect(screen.queryByRole('table')).toBeNull()
	})

	it('mostra a lista vazia', async () => {
		listReturns(listing())
		const screen = await open()

		expect(await screen.findByText('Nenhuma turma cadastrada.')).toBeDefined()
		expect(
			screen.getByText(
				'Crie a primeira turma para usá-la nos gráficos do Início.',
			),
		).toBeDefined()
		const dialog = await openDialog(screen, 'Nova turma', 'Nova turma')
		expect(dialog.getByLabelText('Nome da turma')).toBeDefined()
	})

	it('mostra o erro com "Tentar de novo", que busca de novo', async () => {
		listReturns({ ok: false, message: messages.unavailable }, listing(turma1))
		const screen = await open()

		expect(await screen.findByText(messages.unavailable)).toBeDefined()
		fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

		await table(screen)
		expect(rowNames(screen)).toEqual(['Turma 1'])
		expect(screen.queryByText(messages.unavailable)).toBeNull()
	})

	it('mostra a falta de permissão vinda da API', async () => {
		listReturns({ ok: false, message: messages.forbidden })
		const screen = await open()

		expect(await screen.findByText(messages.forbidden)).toBeDefined()
		expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeDefined()
	})
})

describe('nome da turma', () => {
	it('recusa o nome vazio ou só com espaços sem chamar a API', async () => {
		listReturns(listing(turma1))
		const screen = await open()
		await table(screen)
		const dialog = await openDialog(screen, 'Nova turma', 'Nova turma')

		typeName(dialog, '   ')
		fireEvent.click(dialog.getByRole('button', { name: 'Criar turma' }))

		expect(await dialog.findByText('Informe o nome da turma.')).toBeDefined()
		expect(
			dialog.getByLabelText('Nome da turma').getAttribute('aria-invalid'),
		).toBe('true')
		expect(createMock).not.toHaveBeenCalled()
	})

	it('recusa mais de 60 caracteres sem chamar a API', async () => {
		listReturns(listing(turma1))
		const screen = await open()
		const dialog = await openDialog(screen, 'Editar Turma 1', 'Editar turma')

		typeName(dialog, 'a'.repeat(61))
		fireEvent.click(dialog.getByRole('button', { name: 'Salvar alterações' }))

		expect(
			await dialog.findByText('Use no máximo 60 caracteres.'),
		).toBeDefined()
		expect(renameMock).not.toHaveBeenCalled()
	})

	it('envia o nome sem os espaços das pontas', async () => {
		listReturns(listing(turma1))
		createMock.mockResolvedValue({ ok: true } as never)
		const screen = await open()
		await table(screen)
		const dialog = await openDialog(screen, 'Nova turma', 'Nova turma')

		typeName(dialog, '  Turma 3 ')
		fireEvent.click(dialog.getByRole('button', { name: 'Criar turma' }))

		await waitFor(() =>
			expect(createMock).toHaveBeenCalledWith({ data: { name: 'Turma 3' } }),
		)
	})

	it('mostra o nome duplicado no campo e mantém o modal aberto', async () => {
		listReturns(listing(turma1, turma2))
		createMock.mockResolvedValue({
			ok: false,
			kind: 'conflict',
			fieldErrors: { name: messages.classroomNameTaken },
		} as never)
		const screen = await open()
		await table(screen)
		const dialog = await openDialog(screen, 'Nova turma', 'Nova turma')

		typeName(dialog, 'turma 1')
		fireEvent.click(dialog.getByRole('button', { name: 'Criar turma' }))

		expect(await dialog.findByText(messages.classroomNameTaken)).toBeDefined()
		expect(describedBy(dialog)).toEqual([messages.classroomNameTaken])
		expect(screen.getByRole('dialog', { name: 'Nova turma' })).toBeDefined()
		expect(rowNames(screen)).toEqual(['Turma 1', 'Turma 2'])

		typeName(dialog, 'turma 10')
		expect(dialog.queryByText(messages.classroomNameTaken)).toBeNull()
	})

	it('mostra o erro de campo vindo da API', async () => {
		listReturns(listing(turma1))
		renameMock.mockResolvedValue({
			ok: false,
			kind: 'validation',
			fieldErrors: { name: 'deve ter no máximo 60 caracteres' },
		} as never)
		const screen = await open()
		const dialog = await openDialog(screen, 'Editar Turma 1', 'Editar turma')

		fireEvent.click(dialog.getByRole('button', { name: 'Salvar alterações' }))

		expect(
			await dialog.findByText('deve ter no máximo 60 caracteres'),
		).toBeDefined()
	})
})

describe('criar turma', () => {
	it('abre o modal com o foco no campo e o placeholder da próxima turma', async () => {
		listReturns(listing(turma1, turma2))
		const screen = await open()
		await table(screen)
		const dialog = await openDialog(screen, 'Nova turma', 'Nova turma')

		const input = dialog.getByLabelText('Nome da turma') as HTMLInputElement
		expect(
			dialog.getByText(
				'A turma aparece nos gráficos do Início assim que for criada.',
			),
		).toBeDefined()
		expect(input.placeholder).toBe('Ex.: Turma 3')
		expect(input.value).toBe('')
		await waitFor(() => expect(document.activeElement).toBe(input))
	})

	it('fecha o modal, mostra o aviso e busca a lista de novo', async () => {
		const turma3 = classroom('Turma 3')
		listReturns(listing(turma1, turma2), listing(turma1, turma2, turma3))
		createMock.mockResolvedValue({ ok: true } as never)
		const screen = await open()
		await table(screen)
		const dialog = await openDialog(screen, 'Nova turma', 'Nova turma')

		typeName(dialog, '  Turma 3 ')
		fireEvent.click(dialog.getByRole('button', { name: 'Criar turma' }))

		expect(await screen.findByText(messages.classroomCreated)).toBeDefined()
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: 'Nova turma' })).toBeNull(),
		)
		await waitFor(() =>
			expect(rowNames(screen)).toEqual(['Turma 1', 'Turma 2', 'Turma 3']),
		)
		expect(
			screen.getByText(
				'3 turmas cadastradas. Elas aparecem nos gráficos do Início.',
			),
		).toBeDefined()
	})
})

describe('renomear turma', () => {
	it('abre o modal com o nome e os alunos da turma', async () => {
		listReturns(listing(classroom('Turma 1', { studentCount: 38 })))
		const screen = await open()
		const dialog = await openDialog(screen, 'Editar Turma 1', 'Editar turma')

		const input = dialog.getByLabelText('Nome da turma') as HTMLInputElement
		expect(input.value).toBe('Turma 1')
		expect(dialog.getByText('38 alunos nesta turma')).toBeDefined()
		expect(
			dialog.getByText('Mudar o nome não tira nenhum aluno da turma.'),
		).toBeDefined()
		await waitFor(() => expect(document.activeElement).toBe(input))
	})

	it('renomeia e mantém a data de criação', async () => {
		const renamed = { ...turma1, name: 'Maternal A' }
		listReturns(listing(turma1), listing(renamed))
		renameMock.mockResolvedValue({ ok: true } as never)
		const screen = await open()
		const dialog = await openDialog(screen, 'Editar Turma 1', 'Editar turma')

		typeName(dialog, 'Maternal A')
		fireEvent.click(dialog.getByRole('button', { name: 'Salvar alterações' }))

		expect(await screen.findByText(messages.classroomRenamed)).toBeDefined()
		expect(renameMock).toHaveBeenCalledWith({
			data: { id: turma1.id, name: 'Maternal A' },
		})
		await waitFor(() => expect(rowNames(screen)).toEqual(['Maternal A']))
		const cells = within(
			screen.getByRole('table', { name: 'Turmas' }).querySelectorAll('tr')[1],
		).getAllByRole('cell')
		expect(cells[4].textContent).toBe('02/02/2026')
	})
})

describe('excluir turma', () => {
	it('pede confirmação, com o foco em Cancelar, e exclui', async () => {
		const turma3 = classroom('Turma 3')
		listReturns(listing(turma1, turma3), listing(turma1))
		deleteMock.mockResolvedValue({ ok: true } as never)
		const screen = await open()
		const dialog = await openDialog(
			screen,
			'Excluir Turma 3',
			'Excluir Turma 3?',
		)

		expect(
			dialog.getByText(
				'A turma sai da lista e dos gráficos do Início. Só dá para excluir turmas sem alunos.',
			),
		).toBeDefined()
		expect(dialog.getByText('Essa ação não pode ser desfeita.')).toBeDefined()
		await waitFor(() =>
			expect(document.activeElement).toBe(
				dialog.getByRole('button', { name: 'Cancelar' }),
			),
		)

		fireEvent.click(dialog.getByRole('button', { name: 'Excluir turma' }))

		expect(await screen.findByText(messages.classroomDeleted)).toBeDefined()
		expect(deleteMock).toHaveBeenCalledWith({ data: { id: turma3.id } })
		await waitFor(() => expect(rowNames(screen)).toEqual(['Turma 1']))
		await waitFor(() =>
			expect(document.activeElement).toBe(
				screen.getByRole('button', { name: 'Nova turma' }),
			),
		)
	})

	it('cancelar não exclui', async () => {
		listReturns(listing(turma1))
		const screen = await open()
		const dialog = await openDialog(
			screen,
			'Excluir Turma 1',
			'Excluir Turma 1?',
		)

		fireEvent.click(dialog.getByRole('button', { name: 'Cancelar' }))

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
		expect(deleteMock).not.toHaveBeenCalled()
		expect(rowNames(screen)).toEqual(['Turma 1'])
	})

	it('mostra que a turma tem alunos no 409', async () => {
		listReturns(listing(turma1))
		deleteMock.mockResolvedValue({
			ok: false,
			kind: 'conflict',
			message: messages.classroomHasStudents,
			fieldErrors: {},
		} as never)
		const screen = await open()
		const dialog = await openDialog(
			screen,
			'Excluir Turma 1',
			'Excluir Turma 1?',
		)

		fireEvent.click(dialog.getByRole('button', { name: 'Excluir turma' }))

		expect(await dialog.findByText(messages.classroomHasStudents)).toBeDefined()
		expect(
			screen.getByRole('dialog', { name: 'Excluir Turma 1?' }),
		).toBeDefined()
		expect(rowNames(screen)).toEqual(['Turma 1'])
	})
})

describe('comportamento dos modais', () => {
	it('no 404, fecha, avisa e busca a lista de novo', async () => {
		listReturns(listing(turma1, turma2), listing(turma1))
		renameMock.mockResolvedValue({
			ok: false,
			kind: 'not-found',
			message: messages.notFound,
			fieldErrors: {},
		} as never)
		const screen = await open()
		const dialog = await openDialog(screen, 'Editar Turma 2', 'Editar turma')

		fireEvent.click(dialog.getByRole('button', { name: 'Salvar alterações' }))

		expect(await screen.findByText(messages.classroomNotFound)).toBeDefined()
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
		await waitFor(() => expect(rowNames(screen)).toEqual(['Turma 1']))
		expect(listMock).toHaveBeenCalledTimes(2)
	})

	it('durante o envio, desabilita os botões e ignora o Esc', async () => {
		listReturns(listing(turma1))
		createMock.mockReturnValue(new Promise(() => {}))
		const screen = await open()
		await table(screen)
		const dialog = await openDialog(screen, 'Nova turma', 'Nova turma')

		typeName(dialog, 'Turma 2')
		fireEvent.click(dialog.getByRole('button', { name: 'Criar turma' }))

		await waitFor(() =>
			expect(
				(
					dialog.getByRole('button', {
						name: 'Criar turma',
					}) as HTMLButtonElement
				).disabled,
			).toBe(true),
		)
		expect(
			(dialog.getByRole('button', { name: 'Cancelar' }) as HTMLButtonElement)
				.disabled,
		).toBe(true)
		fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
		expect(screen.getByRole('dialog', { name: 'Nova turma' })).toBeDefined()
	})

	it('Esc descarta o que foi digitado e devolve o foco', async () => {
		listReturns(listing(turma1))
		const screen = await open()
		await table(screen)
		const newButton = screen.getByRole('button', { name: 'Nova turma' })
		let dialog = await openDialog(screen, 'Nova turma', 'Nova turma')

		typeName(dialog, 'Turma 9')
		fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
		await waitFor(() => expect(document.activeElement).toBe(newButton))
		dialog = await openDialog(screen, 'Nova turma', 'Nova turma')
		expect(
			(dialog.getByLabelText('Nome da turma') as HTMLInputElement).value,
		).toBe('')
	})

	it('Cancelar no modal de edição devolve o foco ao botão da linha', async () => {
		listReturns(listing(turma1))
		const screen = await open()
		const editButton = (await table(screen)).getByRole('button', {
			name: 'Editar Turma 1',
		})
		const dialog = await openDialog(screen, 'Editar Turma 1', 'Editar turma')

		fireEvent.click(dialog.getByRole('button', { name: 'Cancelar' }))

		await waitFor(() => expect(document.activeElement).toBe(editButton))
	})

	it('mostra o servidor indisponível num alerta, com o modal aberto', async () => {
		listReturns(listing(turma1))
		renameMock.mockResolvedValue({
			ok: false,
			kind: 'unavailable',
			message: messages.unavailable,
			fieldErrors: {},
		} as never)
		const screen = await open()
		const dialog = await openDialog(screen, 'Editar Turma 1', 'Editar turma')

		fireEvent.click(dialog.getByRole('button', { name: 'Salvar alterações' }))

		expect(await dialog.findByRole('alert')).toBeDefined()
		expect(dialog.getByText(messages.unavailable)).toBeDefined()
		expect(screen.getByRole('dialog', { name: 'Editar turma' })).toBeDefined()
	})
})
