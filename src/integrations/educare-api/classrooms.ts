import type { ApiClient } from './client'
import { ApiError, type FormError, toFormError, unwrap } from './errors'
import { messages } from './messages'
import type { components } from './schema.gen'
import type { ClassroomNameValues, RenameClassroomValues } from './validation'

// Lógica das server functions de turmas, com a API injetada para testar sem o
// runtime do Start. A ligação fica em `functions.ts`. Nenhuma função devolve
// um `ApiError`: a server function só garante serializar valores simples.

export type Classroom = Pick<
	components['schemas']['ClassroomResponse'],
	'id' | 'name' | 'studentCount' | 'maleCount' | 'femaleCount' | 'createdAt'
>

export type ListResult =
	| { ok: true; classrooms: Classroom[] }
	| { ok: false; message: string }

export type ClassroomResult = { ok: true } | ({ ok: false } & FormError)

type Api = Pick<ApiClient, 'GET' | 'POST' | 'PUT' | 'DELETE'>

/** O `401` segue para o middleware, que encerra a sessão. */
function rethrowUnauthorized(error: unknown) {
	if (error instanceof ApiError && error.kind === 'unauthorized') throw error
}

function failure(error: unknown, conflict: Partial<FormError> = {}) {
	rethrowUnauthorized(error)
	const result = toFormError(error)
	if (result.kind === 'conflict') {
		return { ok: false as const, ...result, message: undefined, ...conflict }
	}
	return { ok: false as const, ...result }
}

/** Turmas na ordem da API (alfabética pelo nome), só com os campos usados. */
export async function listClassrooms(
	api: Pick<Api, 'GET'>,
): Promise<ListResult> {
	try {
		const list = await unwrap(api.GET('/api/v1/classrooms'))
		return {
			ok: true,
			classrooms: list.map((classroom) => ({
				id: classroom.id,
				name: classroom.name,
				studentCount: classroom.studentCount,
				maleCount: classroom.maleCount,
				femaleCount: classroom.femaleCount,
				createdAt: classroom.createdAt,
			})),
		}
	} catch (error) {
		rethrowUnauthorized(error)
		return {
			ok: false,
			message: toFormError(error).message ?? messages.unavailable,
		}
	}
}

export async function createClassroom(
	api: Pick<Api, 'POST'>,
	values: ClassroomNameValues,
): Promise<ClassroomResult> {
	try {
		await unwrap(
			api.POST('/api/v1/classrooms', { body: { name: values.name.trim() } }),
		)
		return { ok: true }
	} catch (error) {
		return failure(error, {
			fieldErrors: { name: messages.classroomNameTaken },
		})
	}
}

export async function renameClassroom(
	api: Pick<Api, 'PUT'>,
	values: RenameClassroomValues,
): Promise<ClassroomResult> {
	try {
		await unwrap(
			api.PUT('/api/v1/classrooms/{id}', {
				params: { path: { id: values.id } },
				body: { name: values.name.trim() },
			}),
		)
		return { ok: true }
	} catch (error) {
		return failure(error, {
			fieldErrors: { name: messages.classroomNameTaken },
		})
	}
}

export async function deleteClassroom(
	api: Pick<Api, 'DELETE'>,
	values: { id: string },
): Promise<ClassroomResult> {
	try {
		await unwrap(
			api.DELETE('/api/v1/classrooms/{id}', {
				params: { path: { id: values.id } },
			}),
		)
		return { ok: true }
	} catch (error) {
		return failure(error, { message: messages.classroomHasStudents })
	}
}
