import { describe, expect, it } from 'vitest'
import {
	footerNav,
	isActive,
	mainNav,
	pageTitle,
	visibleItems,
} from './nav-items'

const byTitle = (title: string) => {
	const item = [...mainNav, ...footerNav].find((nav) => nav.title === title)
	if (!item) throw new Error(`item ${title} não existe`)
	return item
}

describe('isActive', () => {
	it('Início só no caminho exato', () => {
		expect(isActive(byTitle('Início'), '/')).toBe(true)
		expect(isActive(byTitle('Início'), '/alunos')).toBe(false)
	})

	it('os demais itens valem no caminho e abaixo dele', () => {
		expect(isActive(byTitle('Alunos'), '/alunos')).toBe(true)
		expect(isActive(byTitle('Alunos'), '/alunos/123')).toBe(true)
		expect(isActive(byTitle('Configurações'), '/configuracoes/turmas')).toBe(
			true,
		)
	})

	it('não confunde caminhos com o mesmo prefixo', () => {
		expect(isActive(byTitle('Alunos'), '/alunos-antigos')).toBe(false)
	})
})

describe('visibleItems', () => {
	it('ADMIN vê Configurações', () => {
		expect(visibleItems(footerNav, 'ADMIN').map((i) => i.title)).toEqual([
			'Configurações',
		])
	})

	it('USER e roles desconhecidas não veem Configurações', () => {
		expect(visibleItems(footerNav, 'USER')).toEqual([])
		expect(visibleItems(footerNav, 'SECRETARIA')).toEqual([])
	})

	it('itens sem roles aparecem para todos', () => {
		expect(visibleItems(mainNav, 'USER')).toHaveLength(4)
	})
})

describe('pageTitle', () => {
	it.each([
		['/', 'Início'],
		['/alunos', 'Alunos'],
		['/alunos/123', 'Alunos'],
		['/responsaveis', 'Responsáveis'],
		['/turmas', 'Turmas'],
		['/configuracoes', 'Configurações'],
		['/configuracoes/turmas', 'Configurações'],
		['/minha-conta', 'Minha conta'],
		['/desconhecida', 'Educare'],
	])('%s → %s', (pathname, title) => {
		expect(pageTitle(pathname)).toBe(title)
	})
})
