import { describe, expect, it } from 'vitest'
import { sidebarOpenFromCookies } from './sidebar-state'

// `readSidebarOpen` só escolhe entre servidor e navegador com o compilador do
// Start, que o Vitest não roda; a parte do navegador é esta função.
describe('sidebarOpenFromCookies', () => {
	it('sem cookie, aberta', () => {
		expect(sidebarOpenFromCookies('')).toBe(true)
	})

	it('com sidebar_state=false, recolhida', () => {
		expect(sidebarOpenFromCookies('a=1; sidebar_state=false; b=2')).toBe(false)
	})

	it('com sidebar_state=true, aberta', () => {
		expect(sidebarOpenFromCookies('sidebar_state=true')).toBe(true)
	})

	it('não confunde outro cookie com o mesmo sufixo', () => {
		expect(sidebarOpenFromCookies('old_sidebar_state=false')).toBe(true)
	})
})
