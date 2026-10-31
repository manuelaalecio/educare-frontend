import { describe, expect, it } from 'vitest'
import { safeRedirect } from './redirect'

describe('safeRedirect', () => {
	it('volta para a página pedida', () => {
		expect(safeRedirect('/minha-conta')).toBe('/minha-conta')
		expect(safeRedirect('/criancas?pagina=2')).toBe('/criancas?pagina=2')
	})

	it.each([
		['URL externa', 'https://malicioso.example'],
		['sem esquema', '//malicioso.example'],
		['com barra invertida', '/\\malicioso.example'],
		['relativo', 'minha-conta'],
		['o próprio login', '/login'],
		['o login com parâmetros', '/login?redirect=%2F'],
		['vazio', ''],
	])('ignora redirect %s', (_, value) => {
		expect(safeRedirect(value)).toBe('/')
	})

	it.each([
		['ausente', undefined],
		['número', 42],
		['lista', ['/minha-conta']],
	])('ignora valor %s', (_, value) => {
		expect(safeRedirect(value)).toBe('/')
	})
})
