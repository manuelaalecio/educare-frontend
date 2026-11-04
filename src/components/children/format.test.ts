import { describe, expect, it } from 'vitest'
import {
	ageLabel,
	BIRTH_CERTIFICATE_MASK,
	CEP_MASK,
	CPF_MASK,
	childCountLabel,
	formatBirthCertificate,
	formatCpf,
	formatDate,
	formatMasked,
	genderLabels,
	maritalStatusLabels,
	maskBirthCertificate,
	maskCpf,
	maskRg,
	NOT_INFORMED,
	orNotInformed,
	periodLabel,
	raceLabels,
} from './format'

describe('ageLabel', () => {
	it.each([
		['2026-11-01', '2026-11-01', '0 meses'],
		['2026-10-02', '2026-11-01', '0 meses'],
		['2026-10-01', '2026-11-01', '1 mês'],
		['2026-02-01', '2026-11-01', '9 meses'],
		['2026-02-15', '2026-11-01', '8 meses'],
		['2025-11-02', '2026-11-01', '11 meses'],
		['2025-11-01', '2026-11-01', '1 ano'],
		['2022-03-10', '2026-11-01', '4 anos'],
		['2022-11-02', '2026-11-01', '3 anos'],
		['2022-11-01', '2026-11-01', '4 anos'],
		['2024-02-29', '2025-02-28', '11 meses'],
		['2024-02-29', '2025-03-01', '1 ano'],
		['2024-02-29', '2028-02-29', '4 anos'],
	])('nascida em %s, em %s: %s', (birthDate, today, label) => {
		expect(ageLabel(birthDate, today)).toBe(label)
	})
})

describe('formatDate', () => {
	it('escreve dd/mm/aaaa', () => {
		expect(formatDate('2022-03-10')).toBe('10/03/2022')
		expect(formatDate('2026-11-01')).toBe('01/11/2026')
	})
})

describe('formatMasked', () => {
	it.each([
		['52998224725', CPF_MASK, '529.982.247-25'],
		['529.982.247-25', CPF_MASK, '529.982.247-25'],
		['529', CPF_MASK, '529'],
		['5299', CPF_MASK, '529.9'],
		['529982247251234', CPF_MASK, '529.982.247-25'],
		['abc', CPF_MASK, ''],
		['', CPF_MASK, ''],
		['13010111', CEP_MASK, '13010-111'],
		['13010', CEP_MASK, '13010'],
		[
			'10453901552022100012345612345672',
			BIRTH_CERTIFICATE_MASK,
			'104539 01 55 2022 1 00012 345 6123456 72',
		],
		['1045390', BIRTH_CERTIFICATE_MASK, '104539 0'],
	])('%s em %s: %s', (value, pattern, formatted) => {
		expect(formatMasked(value, pattern)).toBe(formatted)
	})
})

describe('CPF', () => {
	it('formata e mascara', () => {
		expect(formatCpf('52998224725')).toBe('529.982.247-25')
		expect(maskCpf('52998224725')).toBe('529.***.***-25')
	})
})

describe('maskRg', () => {
	it('mostra só os 2 últimos caracteres', () => {
		expect(maskRg('12345678X')).toBe('*******8X')
		expect(maskRg('1234567X')).toBe('******7X')
		expect(maskRg('12')).toBe('12')
	})
})

describe('certidão de nascimento', () => {
	const number = '10453901552022100012345612345672'

	it('formata a matrícula', () => {
		expect(formatBirthCertificate(number)).toBe(
			'104539 01 55 2022 1 00012 345 6123456 72',
		)
	})

	it('mascara a matrícula com os 15 primeiros e os 2 últimos', () => {
		expect(maskBirthCertificate(number)).toBe(
			'104539 01 55 2022 1 ••••• ••• ••••••• 72',
		)
	})
})

describe('periodLabel', () => {
	it('turma atual', () => {
		expect(
			periodLabel({
				classroomName: 'Turma 2',
				startDate: '2026-11-01',
				endDate: null,
			}),
		).toBe('Turma 2 · desde 01/11/2026')
	})

	it('turma anterior', () => {
		expect(
			periodLabel({
				classroomName: 'Turma 1',
				startDate: '2026-10-01',
				endDate: '2026-11-01',
			}),
		).toBe('Turma 1 · 01/10/2026 – 01/11/2026')
	})
})

describe('childCountLabel', () => {
	it.each([
		[0, false, '0 crianças cadastradas'],
		[1, false, '1 criança cadastrada'],
		[2, false, '2 crianças cadastradas'],
		[0, true, '0 crianças encontradas'],
		[1, true, '1 criança encontrada'],
		[2, true, '2 crianças encontradas'],
	])('%i com filtro=%s: %s', (count, filtered, label) => {
		expect(childCountLabel(count, filtered)).toBe(label)
	})
})

describe('traduções', () => {
	it('gênero, raça/cor e estado civil', () => {
		expect(genderLabels).toEqual({
			MALE: 'Masculino',
			FEMALE: 'Feminino',
			OTHER: 'Outro',
		})
		expect(raceLabels).toEqual({
			WHITE: 'Branca',
			BLACK: 'Preta',
			BROWN: 'Parda',
			YELLOW: 'Amarela',
			INDIGENOUS: 'Indígena',
		})
		expect(maritalStatusLabels).toEqual({
			SINGLE: 'Solteiro(a)',
			MARRIED: 'Casado(a)',
			STABLE_UNION: 'União estável',
			DIVORCED: 'Divorciado(a)',
			WIDOWED: 'Viúvo(a)',
		})
	})

	it('orNotInformed', () => {
		expect(NOT_INFORMED).toBe('Não informado')
		expect(orNotInformed(null)).toBe('Não informado')
		expect(orNotInformed(undefined)).toBe('Não informado')
		expect(orNotInformed('')).toBe('Não informado')
		expect(orNotInformed('  ')).toBe('Não informado')
		expect(orNotInformed('Campinas')).toBe('Campinas')
	})
})
