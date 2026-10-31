// Textos derivados das turmas, num só lugar para a tabela, a lista e os modais.

import { plural } from '#/components/format'

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

/** Placeholder do modal "Nova turma": a próxima turma da sequência. */
export function nextClassroomPlaceholder(count: number) {
	return `Ex.: Turma ${count + 1}`
}
