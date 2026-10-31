import { describe, expect, it } from 'vitest'
import { initials, memberSince, roleLabel } from './user'

describe('initials', () => {
	it.each([
		['Ana Souza', 'AS'],
		['Ana Maria de Souza', 'AS'],
		['Administrador', 'AD'],
		['  ana   souza  ', 'AS'],
		['Élio Ávila', 'ÉÁ'],
		['', '?'],
		['   ', '?'],
	])('%j → %s', (name, expected) => {
		expect(initials(name)).toBe(expected)
	})
})

describe('roleLabel', () => {
	it('traduz as funções conhecidas', () => {
		expect(roleLabel('COORDENADOR')).toBe('Coordenador(a)')
		expect(roleLabel('EDUCADOR')).toBe('Educador(a)')
	})

	it('mostra as roles antigas como vieram', () => {
		expect(roleLabel('ADMIN')).toBe('ADMIN')
		expect(roleLabel('USER')).toBe('USER')
	})

	it('mostra uma role desconhecida como veio', () => {
		expect(roleLabel('SECRETARIA')).toBe('SECRETARIA')
	})
})

describe('memberSince', () => {
	it.each([
		['2026-03-12T14:00:00Z', 'março de 2026'],
		// 31 de outubro, 22h30, em São Paulo.
		['2026-11-01T01:30:00Z', 'outubro de 2026'],
	])('%s → %s', (createdAt, expected) => {
		expect(memberSince(createdAt)).toBe(expected)
	})
})
