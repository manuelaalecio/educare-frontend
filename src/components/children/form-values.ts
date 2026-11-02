import type { Child } from '#/integrations/educare-api/children'
import {
	type ChildFormValues,
	GENDERS,
	MARITAL_STATUSES,
	RACES,
	UFS,
} from '#/integrations/educare-api/validation'
import {
	CEP_MASK,
	formatBirthCertificate,
	formatCpf,
	formatMasked,
} from './format'

/** O valor, se for uma das opções do seletor; senão "Não informar" (`''`). */
function choice<T extends string>(
	options: readonly T[],
	value: string | undefined,
): '' | T {
	return options.includes(value as T) ? (value as T) : ''
}

/**
 * Converte a criança da API nos valores do formulário de edição: opcionais
 * ausentes como `''`, CPF, CEP e matrícula com as máscaras do formulário.
 */
export function toChildFormValues(child: Child): ChildFormValues {
	return {
		classroomId: child.classroom.id,
		name: child.name,
		birthDate: child.birthDate,
		birthplace: child.birthplace ?? '',
		nationality: child.nationality ?? '',
		gender: choice(GENDERS, child.gender),
		race: choice(RACES, child.race),
		maritalStatus: choice(MARITAL_STATUSES, child.maritalStatus),
		cpf: child.cpf ? formatCpf(child.cpf) : '',
		rg: child.rg ?? '',
		birthCertificateNumber: child.birthCertificateNumber
			? formatBirthCertificate(child.birthCertificateNumber)
			: '',
		cep: formatMasked(child.cep, CEP_MASK),
		address: child.address,
		addressNumber: child.addressNumber,
		addressComplement: child.addressComplement ?? '',
		neighborhood: child.neighborhood,
		city: child.city,
		state: choice(UFS, child.state),
		religion: child.religion ?? '',
		church: child.church ?? '',
		healthReport: child.healthReport ?? '',
		medication: child.medication ?? '',
		medicalObservation: child.medicalObservation ?? '',
	}
}
