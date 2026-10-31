import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { attach, renderRoutes } from '#/testing/render-route'
import { Route as AlunosRoute } from './_authenticated/alunos'
import { Route as ResponsaveisRoute } from './_authenticated/responsaveis'
import { Route as TurmasRoute } from './_authenticated/turmas'

afterEach(cleanup)

describe('páginas provisórias', () => {
	it.each([
		['/alunos', 'Alunos', AlunosRoute],
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

	it("o título da aba é '<área> · Educare'", () => {
		expect(AlunosRoute.options.head?.({} as never)).toEqual({
			meta: [{ title: 'Alunos · Educare' }],
		})
	})
})
