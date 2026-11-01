import { describe, expect, it } from 'vitest'
import { formatCreatedAt, plural } from './format'

describe('plural', () => {
	it('concorda com o número', () => {
		expect(plural(1, 'turma', 'turmas')).toBe('1 turma')
		expect(plural(0, 'turma', 'turmas')).toBe('0 turmas')
		expect(plural(2, 'turma', 'turmas')).toBe('2 turmas')
	})
})

describe('formatCreatedAt', () => {
	it('escreve dd/mm/aaaa', () => {
		expect(formatCreatedAt('2026-02-02T13:00:00Z')).toBe('02/02/2026')
	})

	it('usa o fuso de São Paulo perto da meia-noite', () => {
		expect(formatCreatedAt('2026-03-01T02:30:00Z')).toBe('28/02/2026')
	})
})
