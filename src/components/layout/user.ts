const roleLabels: Record<string, string> = {
	ADMIN: 'Administrador',
	USER: 'Funcionário',
}

/** O contrato não fixa as roles: uma desconhecida aparece como veio. */
export function roleLabel(role: string) {
	return roleLabels[role] ?? role
}

/**
 * Primeira letra da primeira e da última palavra, ou as duas primeiras letras
 * de um nome com uma palavra só.
 */
export function initials(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean)
	if (words.length === 0) return '?'
	const letters =
		words.length === 1
			? Array.from(words[0]).slice(0, 2).join('')
			: Array.from(words[0])[0] + Array.from(words[words.length - 1])[0]
	return letters.toLocaleUpperCase('pt-BR')
}
