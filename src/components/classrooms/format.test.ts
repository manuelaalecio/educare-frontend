import { describe, expect, it } from 'vitest'
import {
	classroomCountLabel,
	formatCreatedAt,
	nextClassroomPlaceholder,
	studentSummary,
	studentsInClassroom,
} from './format'

describe('classroomCountLabel', () => {
	it.each([
		[0, 'Nenhuma turma cadastrada.'],
		[1, '1 turma cadastrada. Elas aparecem nos gráficos do Início.'],
		[2, '2 turmas cadastradas. Elas aparecem nos gráficos do Início.'],
	])('%i turmas', (count, label) => {
		expect(classroomCountLabel(count)).toBe(label)
	})
})

describe('studentSummary', () => {
	it('usa o plural', () => {
		expect(
			studentSummary({ studentCount: 38, maleCount: 20, femaleCount: 18 }),
		).toBe('38 alunos · 20 meninos e 18 meninas')
	})

	it('usa o singular quando o número é 1', () => {
		expect(
			studentSummary({ studentCount: 1, maleCount: 1, femaleCount: 0 }),
		).toBe('1 aluno · 1 menino e 0 meninas')
	})
})

describe('studentsInClassroom', () => {
	it('concorda com o número', () => {
		expect(studentsInClassroom(1)).toBe('1 aluno nesta turma')
		expect(studentsInClassroom(38)).toBe('38 alunos nesta turma')
	})
})

describe('formatCreatedAt', () => {
	it('escreve dd/mm/aaaa', () => {
		expect(formatCreatedAt('2026-02-02T13:00:00Z')).toBe('02/02/2026')
	})

	it('usa o fuso de São Paulo perto da meia-noite', () => {
		expect(formatCreatedAt('2026-03-01T02:30:00Z')).toBe('28/02/2026')
	})
})

describe('nextClassroomPlaceholder', () => {
	it('sugere a próxima turma', () => {
		expect(nextClassroomPlaceholder(2)).toBe('Ex.: Turma 3')
	})
})
