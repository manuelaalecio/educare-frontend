import { describe, expect, it } from 'vitest'
import type { Child } from '#/integrations/educare-api/children'
import {
	childFormSchema,
	EMPTY_CHILD_FORM_VALUES,
	toChildRequest,
} from '#/integrations/educare-api/validation'
import { toChildFormValues } from './form-values'

const minimal: Child = {
	id: '6f1c2c8e-1d1a-4c5e-9a1b-2b3c4d5e6f70',
	name: 'Ana Lima',
	birthDate: '2022-03-15',
	cep: '01310100',
	address: 'Avenida Paulista',
	addressNumber: '1000',
	neighborhood: 'Bela Vista',
	city: 'São Paulo',
	state: 'SP',
	classroom: { id: 'c1', name: 'Turma 1' },
	createdAt: '2026-10-01T12:00:00Z',
	updatedAt: '2026-10-01T12:00:00Z',
}

const complete: Child = {
	...minimal,
	birthplace: 'São Paulo',
	nationality: 'Brasileira',
	gender: 'FEMALE',
	race: 'BROWN',
	maritalStatus: 'SINGLE',
	cpf: '52998224725',
	rg: '12.345.678-X',
	birthCertificateNumber: '10453901552013100012021000012321',
	addressComplement: 'Apto 12',
	religion: 'Católica',
	church: 'Paróquia São José',
	healthReport: 'Laudo',
	medication: 'Nenhuma',
	medicalObservation: 'Alergia a amendoim',
}

describe('toChildFormValues', () => {
	it('preenche os opcionais ausentes com vazio', () => {
		expect(toChildFormValues(minimal)).toEqual({
			...EMPTY_CHILD_FORM_VALUES,
			classroomId: 'c1',
			name: 'Ana Lima',
			birthDate: '2022-03-15',
			cep: '01310-100',
			address: 'Avenida Paulista',
			addressNumber: '1000',
			neighborhood: 'Bela Vista',
			city: 'São Paulo',
			state: 'SP',
		})
	})

	it('aplica as máscaras de CPF, CEP e matrícula e mantém os seletores', () => {
		const values = toChildFormValues(complete)
		expect(values.cpf).toBe('529.982.247-25')
		expect(values.cep).toBe('01310-100')
		expect(values.birthCertificateNumber).toBe(
			'104539 01 55 2013 1 00012 021 0000123 21',
		)
		expect(values.gender).toBe('FEMALE')
		expect(values.race).toBe('BROWN')
		expect(values.maritalStatus).toBe('SINGLE')
		expect(values.rg).toBe('12.345.678-X')
	})

	it('troca valores desconhecidos dos seletores por "Não informar"', () => {
		const values = toChildFormValues({
			...minimal,
			gender: 'X',
			race: '',
			state: 'ZZ',
		})
		expect(values.gender).toBe('')
		expect(values.race).toBe('')
		expect(values.state).toBe('')
	})

	it('volta ao mesmo corpo da API depois de validar', () => {
		const values = toChildFormValues(complete)
		const request = toChildRequest(childFormSchema.parse(values))
		expect(request).toEqual({
			classroomId: 'c1',
			name: 'Ana Lima',
			birthDate: '2022-03-15',
			birthplace: 'São Paulo',
			nationality: 'Brasileira',
			gender: 'FEMALE',
			race: 'BROWN',
			maritalStatus: 'SINGLE',
			cpf: '52998224725',
			rg: '12.345.678-X',
			birthCertificateNumber: '10453901552013100012021000012321',
			cep: '01310100',
			address: 'Avenida Paulista',
			addressNumber: '1000',
			addressComplement: 'Apto 12',
			neighborhood: 'Bela Vista',
			city: 'São Paulo',
			state: 'SP',
			religion: 'Católica',
			church: 'Paróquia São José',
			healthReport: 'Laudo',
			medication: 'Nenhuma',
			medicalObservation: 'Alergia a amendoim',
		})
	})
})
