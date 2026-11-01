// Textos derivados da lista de usuários.

import { plural } from '#/components/format'

/** Subtítulo da aba com o total de usuários. */
export function userCountLabel(total: number) {
	return `${plural(total, 'pessoa', 'pessoas')} com acesso ao sistema`
}

/** "Mostrando 21–25 de 25" para a página `page` (começando em 0). */
export function rangeLabel(
	page: number,
	size: number,
	shown: number,
	total: number,
) {
	if (shown === 0) return `Mostrando 0 de ${total}`
	const first = page * size + 1
	return `Mostrando ${first}–${first + shown - 1} de ${total}`
}
