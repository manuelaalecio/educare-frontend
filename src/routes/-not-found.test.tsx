import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { isNotFound } from '#/components/layout/not-found'
import { renderRoutes } from '#/testing/render-route'
import { Route as RootRoute } from './__root'

afterEach(cleanup)

describe('página não encontrada', () => {
	it('mostra o título, o texto e o link num endereço inexistente', async () => {
		const { screen, router } = await renderRoutes('/qualquer-coisa', () => [])
		expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe(
			'Página não encontrada',
		)
		expect(
			screen.getByText('O endereço que você abriu não existe ou mudou.'),
		).toBeDefined()
		expect(
			screen
				.getByRole('link', { name: 'Voltar ao início' })
				.getAttribute('href'),
		).toBe('/')
		expect(isNotFound(router.state.matches)).toBe(true)
	})

	it('volta ao início pelo link', async () => {
		const { screen, router } = await renderRoutes('/qualquer-coisa', () => [])
		fireEvent.click(
			await screen.findByRole('link', { name: 'Voltar ao início' }),
		)

		expect(await screen.findByText('Página inicial')).toBeDefined()
		expect(router.state.location.pathname).toBe('/')
		expect(isNotFound(router.state.matches)).toBe(false)
	})

	it("o título da aba é 'Página não encontrada · Educare'", async () => {
		const { router } = await renderRoutes('/qualquer-coisa', () => [])
		const head = async (matches: typeof router.state.matches) =>
			(await RootRoute.options.head?.({ matches } as never))?.meta
		expect(await head(router.state.matches)).toContainEqual({
			title: 'Página não encontrada · Educare',
		})

		await router.navigate({ to: '/' })
		expect(await head(router.state.matches)).toContainEqual({
			title: 'Educare',
		})
	})
})
