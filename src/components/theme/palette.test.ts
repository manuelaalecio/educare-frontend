import { describe, expect, it } from 'vitest'
import { textPairs, themeColors, white } from './palette'

function relativeLuminance(hex: string) {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
	})
	return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Fórmula da WCAG 2.x.
function contrastRatio(a: string, b: string) {
	const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
		(x, y) => y - x,
	)
	return (lighter + 0.05) / (darker + 0.05)
}

describe('contrastRatio', () => {
	it('dá 21:1 entre preto e branco', () => {
		expect(contrastRatio('#000000', white)).toBeCloseTo(21)
	})

	it('reprova emerald-600 sobre branco', () => {
		expect(contrastRatio('#059669', white)).toBeLessThan(4.5)
	})
})

describe.each(['light', 'dark'] as const)('contraste no modo %s', (mode) => {
	it.each(
		textPairs(themeColors[mode]),
	)('%s passa de 4,5:1', (_, text, background) => {
		expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(4.5)
	})
})
