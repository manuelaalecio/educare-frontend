export const THEME_STORAGE_KEY = 'educare-tema'

export type Theme = 'claro' | 'escuro'

export const DARK_QUERY = '(prefers-color-scheme: dark)'

function isTheme(value: unknown): value is Theme {
	return value === 'claro' || value === 'escuro'
}

/** A escolha salva vale sobre o sistema; sem escolha válida, vale o sistema. */
export function resolveTheme(
	stored: string | null,
	systemDark: boolean,
): Theme {
	if (isTheme(stored)) return stored
	return systemDark ? 'escuro' : 'claro'
}

/** Lê a escolha salva. Com o armazenamento bloqueado, devolve `null`. */
export function readStoredTheme(): Theme | null {
	try {
		const stored = localStorage.getItem(THEME_STORAGE_KEY)
		return isTheme(stored) ? stored : null
	} catch {
		return null
	}
}

/** Salva a escolha. Com o armazenamento bloqueado, não faz nada. */
export function saveTheme(theme: Theme) {
	try {
		localStorage.setItem(THEME_STORAGE_KEY, theme)
	} catch {
		// Sem armazenamento, o tema vale só para a página aberta.
	}
}

export function applyTheme(theme: Theme, root = document.documentElement) {
	const dark = theme === 'escuro'
	root.classList.toggle('dark', dark)
	root.style.colorScheme = dark ? 'dark' : 'light'
}

/**
 * Script inline do `<head>`: aplica o tema antes da primeira pintura.
 * Repete `readStoredTheme`, `resolveTheme` e `applyTheme` sem depender do bundle.
 */
export const themeScript = `(function(){var s=null;try{s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}var d=s==="escuro"||(s!=="claro"&&window.matchMedia(${JSON.stringify(DARK_QUERY)}).matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"})()`
