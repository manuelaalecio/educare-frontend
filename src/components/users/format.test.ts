import { describe, expect, it } from 'vitest'
import { rangeLabel, userCountLabel } from './format'

describe('userCountLabel', () => {
	it('concorda com o número', () => {
		expect(userCountLabel(1)).toBe('1 pessoa com acesso ao sistema')
		expect(userCountLabel(5)).toBe('5 pessoas com acesso ao sistema')
	})
})

describe('rangeLabel', () => {
	it('mostra a faixa da primeira página', () => {
		expect(rangeLabel(0, 20, 5, 5)).toBe('Mostrando 1–5 de 5')
	})

	it('mostra a faixa de uma página do meio ou da última', () => {
		expect(rangeLabel(1, 20, 5, 25)).toBe('Mostrando 21–25 de 25')
		expect(rangeLabel(0, 20, 20, 25)).toBe('Mostrando 1–20 de 25')
	})

	it('não inventa uma faixa sem itens', () => {
		expect(rangeLabel(3, 20, 0, 25)).toBe('Mostrando 0 de 25')
	})
})
