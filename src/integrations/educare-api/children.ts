import type { ApiClient } from './client'
import { ApiError, type FormError, toFormError, unwrap } from './errors'
import { messages } from './messages'
import type { components } from './schema.gen'

// Lógica das server functions de crianças, com a API injetada para testar sem
// o runtime do Start. A ligação fica em `functions.ts`. Nenhuma função devolve
// um `ApiError` nem registra corpo, resposta ou id em log (LGPD).

type Schemas = components['schemas']

/** Corpo de criar e alterar: substituição completa, com `classroomId`. */
export type ChildBody = Schemas['ChildRequest']

/** Só o resumo que a lista mostra; o resto dos dados fica nos detalhes. */
export type ChildSummary = {
	id: string
	name: string
	birthDate: string
	classroom: { id: string; name: string }
}

export type Child = Omit<Schemas['ChildResponse'], 'classroom'> & {
	classroom: { id: string; name: string }
}

export type ChildClassroomPeriod = {
	classroomId: string
	classroomName: string
	startDate: string
	/** `null` no período atual. */
	endDate: string | null
}

export type ChildrenPage = {
	/** Começa em 0, como na API. */
	number: number
	size: number
	totalElements: number
	totalPages: number
}

export type ChildrenFilters = {
	nome?: string
	turma?: string
	/** Começa em 1, como na URL. */
	pagina: number
}

export type ChildFailure = { ok: false } & FormError

export type ListChildrenResult =
	| { ok: true; children: ChildSummary[]; page: ChildrenPage }
	| { ok: false; message: string }

export type GetChildResult =
	| { ok: true; child: Child | null }
	| { ok: false; message: string }

export type ChildClassroomsResult =
	| { ok: true; periods: ChildClassroomPeriod[] }
	| { ok: false; message: string }

/** Criar e alterar devolvem o id, para navegar até os detalhes. */
export type ChildResult = { ok: true; id: string } | ChildFailure

/** `notFound`: a criança já não existia; o hook navega e invalida igual. */
export type DeleteChildResult = { ok: true; notFound?: true } | ChildFailure

export const CHILDREN_PAGE_SIZE = 20

type Api = Pick<ApiClient, 'GET' | 'POST' | 'PUT' | 'DELETE'>

/** O `401` segue para o middleware, que encerra a sessão. */
function rethrowUnauthorized(error: unknown) {
	if (error instanceof ApiError && error.kind === 'unauthorized') throw error
}

function loadFailure(error: unknown) {
	rethrowUnauthorized(error)
	return {
		ok: false as const,
		message: toFormError(error).message ?? messages.unavailable,
	}
}

const isNotFound = (error: unknown) =>
	error instanceof ApiError && error.kind === 'not-found'

// Sem letra antes nem depois: "RG" não casa dentro de "ÓRGÃO" nem "CARGO".
const conflictRules = [
	{
		pattern: /(?<!\p{L})CPF(?!\p{L})/u,
		field: 'cpf',
		message: 'childCpfTaken',
	},
	{ pattern: /(?<!\p{L})RG(?!\p{L})/u, field: 'rg', message: 'childRgTaken' },
	{
		pattern: /certidão/iu,
		field: 'birthCertificateNumber',
		message: 'childCertificateTaken',
	},
] as const

/**
 * O back não diferencia os `409` por código: o `detail` decide o campo
 * (design, D7). Sem correspondência, `null`, e o `409` vira alerta com o
 * `detail`. As mensagens não repetem o número do documento.
 */
export function conflictField(
	detail: string | undefined,
): { field: keyof ChildBody; message: string } | null {
	if (!detail) return null
	for (const rule of conflictRules) {
		if (rule.pattern.test(detail)) {
			return { field: rule.field, message: messages[rule.message] }
		}
	}
	return null
}

function failure(error: unknown): ChildFailure {
	rethrowUnauthorized(error)
	const result = toFormError(error)
	if (result.kind === 'conflict') {
		const detail = error instanceof ApiError ? error.detail : undefined
		const conflict = conflictField(detail)
		if (conflict) {
			return {
				ok: false,
				...result,
				message: undefined,
				fieldErrors: { [conflict.field]: conflict.message },
			}
		}
	}
	if (result.kind === 'not-found') {
		return { ok: false, ...result, message: messages.childNotFound }
	}
	return { ok: false, ...result }
}

/** Uma página de crianças, por nome, só com o resumo de cada uma. */
export async function listChildren(
	api: Pick<Api, 'GET'>,
	values: ChildrenFilters,
): Promise<ListChildrenResult> {
	try {
		const result = await unwrap(
			api.GET('/api/v1/children', {
				params: {
					// O contrato descreve o `Pageable` como um objeto, mas o Spring lê
					// `page`, `size` e `sort` soltos na query.
					query: {
						name: values.nome,
						classroomId: values.turma,
						page: values.pagina - 1,
						size: CHILDREN_PAGE_SIZE,
						sort: 'name',
					} as never,
				},
			}),
		)
		return {
			ok: true,
			children: result.content.map((child) => ({
				id: child.id,
				name: child.name,
				birthDate: child.birthDate,
				classroom: { id: child.classroom.id, name: child.classroom.name },
			})),
			page: {
				number: result.page.number,
				size: result.page.size,
				totalElements: result.page.totalElements,
				totalPages: result.page.totalPages,
			},
		}
	} catch (error) {
		return loadFailure(error)
	}
}

/** `child: null` quando a criança não existe (`404`). */
export async function getChild(
	api: Pick<Api, 'GET'>,
	values: { id: string },
): Promise<GetChildResult> {
	try {
		const child = await unwrap(
			api.GET('/api/v1/children/{id}', {
				params: { path: { id: values.id } },
			}),
		)
		return {
			ok: true,
			child: {
				id: child.id,
				name: child.name,
				birthDate: child.birthDate,
				gender: child.gender,
				race: child.race,
				nationality: child.nationality,
				birthplace: child.birthplace,
				maritalStatus: child.maritalStatus,
				religion: child.religion,
				church: child.church,
				cpf: child.cpf,
				rg: child.rg,
				birthCertificateNumber: child.birthCertificateNumber,
				cep: child.cep,
				address: child.address,
				addressNumber: child.addressNumber,
				addressComplement: child.addressComplement,
				neighborhood: child.neighborhood,
				city: child.city,
				state: child.state,
				healthReport: child.healthReport,
				medication: child.medication,
				medicalObservation: child.medicalObservation,
				classroom: { id: child.classroom.id, name: child.classroom.name },
				createdAt: child.createdAt,
				updatedAt: child.updatedAt,
			},
		}
	} catch (error) {
		if (isNotFound(error)) return { ok: true, child: null }
		return loadFailure(error)
	}
}

/** Histórico de turmas, do período mais recente para o mais antigo. */
export async function listChildClassrooms(
	api: Pick<Api, 'GET'>,
	values: { id: string },
): Promise<ChildClassroomsResult> {
	try {
		const list = await unwrap(
			api.GET('/api/v1/children/{id}/classrooms', {
				params: { path: { id: values.id } },
			}),
		)
		const periods = list.map((period) => ({
			classroomId: period.classroomId,
			classroomName: period.classroomName,
			startDate: period.startDate,
			endDate: period.endDate ?? null,
		}))
		// Datas `AAAA-MM-DD` comparam como texto; no empate, o período aberto
		// (atual) vem antes.
		periods.sort((a, b) => {
			if (a.startDate !== b.startDate) return a.startDate < b.startDate ? 1 : -1
			if (a.endDate === b.endDate) return 0
			if (a.endDate === null) return -1
			if (b.endDate === null) return 1
			return a.endDate < b.endDate ? 1 : -1
		})
		return { ok: true, periods }
	} catch (error) {
		return loadFailure(error)
	}
}

export async function createChild(
	api: Pick<Api, 'POST'>,
	body: ChildBody,
): Promise<ChildResult> {
	try {
		const child = await unwrap(api.POST('/api/v1/children', { body }))
		return { ok: true, id: child.id }
	} catch (error) {
		return failure(error)
	}
}

/** Substituição completa (`PUT`), com a turma. */
export async function updateChild(
	api: Pick<Api, 'PUT'>,
	values: { id: string } & ChildBody,
): Promise<ChildResult> {
	const { id, ...body } = values
	try {
		await unwrap(
			api.PUT('/api/v1/children/{id}', {
				params: { path: { id } },
				body,
			}),
		)
		return { ok: true, id }
	} catch (error) {
		return failure(error)
	}
}

export async function deleteChild(
	api: Pick<Api, 'DELETE'>,
	values: { id: string },
): Promise<DeleteChildResult> {
	try {
		await unwrap(
			api.DELETE('/api/v1/children/{id}', {
				params: { path: { id: values.id } },
			}),
		)
		return { ok: true }
	} catch (error) {
		if (isNotFound(error)) return { ok: true, notFound: true }
		return failure(error)
	}
}
