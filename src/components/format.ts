// Formatação usada por mais de uma área.

/** "1 turma" ou "2 turmas": o número com o singular ou o plural. */
export function plural(count: number, singular: string, plural: string) {
	return `${count} ${count === 1 ? singular : plural}`
}

// A escola fica em São Paulo, e o fuso fixo faz o SSR (em UTC) e o navegador
// escreverem a mesma data.
const createdAtFormat = new Intl.DateTimeFormat('pt-BR', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	timeZone: 'America/Sao_Paulo',
})

/** Data de criação como "02/02/2026". */
export function formatCreatedAt(createdAt: string) {
	return createdAtFormat.format(new Date(createdAt))
}
