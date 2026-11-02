import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { attach, renderRoutes } from '#/testing/render-route'
import { Route as ChildrenRoute } from './_authenticated/criancas/index'
import { Route as ResponsaveisRoute } from './_authenticated/responsaveis'
import { Route as TurmasRoute } from './_authenticated/turmas'

afterEach(cleanup)

describe('páginas provisórias', () => {
	it.each([
		['/responsaveis', 'Responsáveis', ResponsaveisRoute],
		['/turmas', 'Turmas', TurmasRoute],
	])('%s mostra o título e o aviso', async (path, title, route) => {
		const { screen } = await renderRoutes(path, (root) => [
			attach(route, root, { id: path, path }),
		])
		expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(
			title,
		)
		expect(
			screen.getByText('Esta página ainda está em construção.'),
		).toBeDefined()
	})

	it.each([
		[ResponsaveisRoute, 'Responsáveis · Educare'],
		[TurmasRoute, 'Turmas · Educare'],
		[ChildrenRoute, 'Crianças · Educare'],
	])("o título da aba é '<área> · Educare'", (route, title) => {
		expect(route.options.head?.({} as never)).toEqual({
			meta: [{ title }],
		})
	})

	it('/alunos não existe mais e mostra a página não encontrada', async () => {
		const { screen, router } = await renderRoutes('/alunos', (root) => [
			attach(ResponsaveisRoute, root, {
				id: '/responsaveis',
				path: '/responsaveis',
			}),
			attach(TurmasRoute, root, { id: '/turmas', path: '/turmas' }),
		])
		expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(
			'Página não encontrada',
		)
		expect(router.state.location.pathname).toBe('/alunos')
	})
})
