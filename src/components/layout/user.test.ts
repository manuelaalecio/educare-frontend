import { describe, expect, it } from 'vitest'
import { initials, roleLabel } from './user'

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
	it('traduz as roles conhecidas', () => {
		expect(roleLabel('ADMIN')).toBe('Administrador')
		expect(roleLabel('USER')).toBe('Funcionário')
	})

	it('mostra uma role desconhecida como veio', () => {
		expect(roleLabel('SECRETARIA')).toBe('SECRETARIA')
	})
})
