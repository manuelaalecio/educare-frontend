import { describe, expect, it } from 'vitest'
import { formatCreatedAt, plural, updatedAtLabel } from './format'

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

describe('updatedAtLabel', () => {
	const now = 1_800_000_000_000

	it.each([
		[0, 'Atualizado agora'],
		[59_999, 'Atualizado agora'],
		[60_000, 'Atualizado há 1 min'],
		[3 * 60_000 + 30_000, 'Atualizado há 3 min'],
	])('há %i ms: %s', (elapsed, label) => {
		expect(updatedAtLabel(now - elapsed, now)).toBe(label)
	})
})
