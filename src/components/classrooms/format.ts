// Textos derivados das turmas, num só lugar para a tabela, a lista e os modais.

export function plural(count: number, singular: string, plural: string) {
	return `${count} ${count === 1 ? singular : plural}`
}

const SUBTITLE_SUFFIX = 'Elas aparecem nos gráficos do Início.'

/** Subtítulo da aba com o total de turmas. */
export function classroomCountLabel(count: number) {
	if (count === 0) return 'Nenhuma turma cadastrada.'
	return `${plural(count, 'turma cadastrada', 'turmas cadastradas')}. ${SUBTITLE_SUFFIX}`
}

type Counts = { studentCount: number; maleCount: number; femaleCount: number }

/** "38 alunos · 20 meninos e 18 meninas", com singular quando for 1. */
export function studentSummary({
	studentCount,
	maleCount,
	femaleCount,
}: Counts) {
	return `${plural(studentCount, 'aluno', 'alunos')} · ${plural(maleCount, 'menino', 'meninos')} e ${plural(femaleCount, 'menina', 'meninas')}`
}

/** "38 alunos nesta turma", no modal de edição. */
export function studentsInClassroom(count: number) {
	return `${plural(count, 'aluno', 'alunos')} nesta turma`
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

/** Placeholder do modal "Nova turma": a próxima turma da sequência. */
export function nextClassroomPlaceholder(count: number) {
	return `Ex.: Turma ${count + 1}`
}
