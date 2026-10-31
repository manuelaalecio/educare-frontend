import { Moon, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '#/components/ui/button'
import {
	applyTheme,
	DARK_QUERY,
	readStoredTheme,
	resolveTheme,
	saveTheme,
	type Theme,
} from './theme-script'

export function ThemeToggle({ className }: { className?: string }) {
	// O servidor não sabe o tema: o ícone e o nome só aparecem depois de montar.
	const [theme, setTheme] = useState<Theme>()
	const chosen = useRef(false)

	useEffect(() => {
		const media = window.matchMedia(DARK_QUERY)
		const stored = readStoredTheme()
		const initial = resolveTheme(stored, media.matches)
		chosen.current = stored !== null
		applyTheme(initial)
		setTheme(initial)

		function onSystemChange(event: MediaQueryListEvent) {
			if (chosen.current) return
			const next = event.matches ? 'escuro' : 'claro'
			applyTheme(next)
			setTheme(next)
		}

		media.addEventListener('change', onSystemChange)
		return () => media.removeEventListener('change', onSystemChange)
	}, [])

	function toggle() {
		const current = document.documentElement.classList.contains('dark')
			? 'escuro'
			: 'claro'
		const next = current === 'escuro' ? 'claro' : 'escuro'
		chosen.current = true
		applyTheme(next)
		saveTheme(next)
		setTheme(next)
	}

	return (
		<Button
			variant='ghost'
			size='icon'
			className={className}
			onClick={toggle}
			aria-label={
				theme && (theme === 'escuro' ? 'Usar tema claro' : 'Usar tema escuro')
			}
		>
			{theme === 'escuro' && <Sun />}
			{theme === 'claro' && <Moon />}
		</Button>
	)
}
