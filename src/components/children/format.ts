// Textos derivados das crianças, num só lugar para a lista, os detalhes e o
// formulário. Funções puras: as datas chegam como 'AAAA-MM-DD' e nada aqui
// cria um `Date`, para o SSR e o navegador escreverem o mesmo texto.

import { plural } from '#/components/format'

export const NOT_INFORMED = 'Não informado'

/** O valor, ou "Não informado" quando vier vazio. */
export function orNotInformed(value: string | null | undefined) {
	return value?.trim() ? value : NOT_INFORMED
}

export const genderLabels = {
	MALE: 'Masculino',
	FEMALE: 'Feminino',
	OTHER: 'Outro',
} as const

export const raceLabels = {
	WHITE: 'Branca',
	BLACK: 'Preta',
	BROWN: 'Parda',
	YELLOW: 'Amarela',
	INDIGENOUS: 'Indígena',
} as const

export const maritalStatusLabels = {
	SINGLE: 'Solteiro(a)',
	MARRIED: 'Casado(a)',
	STABLE_UNION: 'União estável',
	DIVORCED: 'Divorciado(a)',
	WIDOWED: 'Viúvo(a)',
} as const

function parseDate(date: string) {
	const [year, month, day] = date.split('-').map(Number)
	return { year, month, day }
}

/**
 * Idade em anos completos ("1 ano", "4 anos") ou, abaixo de 1 ano, em meses
 * completos ("0 meses", "1 mês"). Quem nasceu em 29/02 faz aniversário em
 * 01/03 nos anos não bissextos.
 */
export function ageLabel(birthDate: string, today: string) {
	const birth = parseDate(birthDate)
	const now = parseDate(today)
	let months = (now.year - birth.year) * 12 + (now.month - birth.month)
	if (now.day < birth.day) months -= 1
	const years = Math.floor(months / 12)
	if (years >= 1) return plural(years, 'ano', 'anos')
	return plural(Math.max(months, 0), 'mês', 'meses')
}

/** 'AAAA-MM-DD' como "dd/mm/aaaa". */
export function formatDate(date: string) {
	const [year, month, day] = date.split('-')
	return `${day}/${month}/${year}`
}

export const CPF_MASK = '000.000.000-00'
export const CEP_MASK = '00000-000'
export const BIRTH_CERTIFICATE_MASK = '000000 00 00 0000 0 00000 000 0000000 00'

/**
 * Os dígitos de `value` no padrão, em que `0` é um dígito e o resto é
 * separador. Corta no tamanho do padrão e não deixa separador no fim.
 */
export function formatMasked(value: string, pattern: string) {
	const digits = value.replace(/\D/g, '')
	let result = ''
	let next = 0
	for (const char of pattern) {
		if (next >= digits.length) break
		if (char === '0') {
			result += digits[next]
			next += 1
		} else {
			result += char
		}
	}
	return result
}

/** Troca por `symbol` os dígitos nas posições de `start` até `end` (exclusivo). */
function hideDigits(
	formatted: string,
	start: number,
	end: number,
	symbol: string,
) {
	let index = 0
	return Array.from(formatted, (char) => {
		if (!/\d/.test(char)) return char
		const hidden = index >= start && index < end
		index += 1
		return hidden ? symbol : char
	}).join('')
}

/** "529.982.247-25". */
export function formatCpf(cpf: string) {
	return formatMasked(cpf, CPF_MASK)
}

/** "529.***.***-25": só os 3 primeiros e os 2 últimos números. */
export function maskCpf(cpf: string) {
	const formatted = formatCpf(cpf)
	const length = cpf.replace(/\D/g, '').length
	return hideDigits(formatted, 3, length - 2, '*')
}

/** "******8X": só os 2 últimos caracteres. */
export function maskRg(rg: string) {
	return '*'.repeat(Math.max(rg.length - 2, 0)) + rg.slice(-2)
}

/** "104539 01 55 2022 1 00012 345 6123456 72". */
export function formatBirthCertificate(number: string) {
	return formatMasked(number, BIRTH_CERTIFICATE_MASK)
}

/** "104539 01 55 2022 1 ••••• ••• ••••••• 72": 15 primeiros e 2 últimos. */
export function maskBirthCertificate(number: string) {
	const formatted = formatBirthCertificate(number)
	const length = number.replace(/\D/g, '').length
	return hideDigits(formatted, 15, length - 2, '•')
}

type Period = {
	classroomName: string
	startDate: string
	endDate: string | null | undefined
}

/** "Turma 2 · desde 01/11/2026" ou "Turma 1 · 01/10/2026 – 01/11/2026". */
export function periodLabel({ classroomName, startDate, endDate }: Period) {
	if (!endDate) return `${classroomName} · desde ${formatDate(startDate)}`
	return `${classroomName} · ${formatDate(startDate)} – ${formatDate(endDate)}`
}

/** Subtítulo da lista: "cadastradas" sem filtro, "encontradas" com filtro. */
export function childCountLabel(count: number, filtered: boolean) {
	return filtered
		? plural(count, 'criança encontrada', 'crianças encontradas')
		: plural(count, 'criança cadastrada', 'crianças cadastradas')
}
