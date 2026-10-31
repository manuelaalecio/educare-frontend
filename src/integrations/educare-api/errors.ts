import { messages } from './messages'

export type ApiErrorKind =
	| 'validation'
	| 'unauthorized'
	| 'forbidden'
	| 'not-found'
	| 'conflict'
	| 'unavailable'

/** Erro de chamada à API, já sem detalhes internos da resposta. */
export class ApiError extends Error {
	readonly kind: ApiErrorKind
	readonly status?: number
	readonly title?: string
	readonly detail?: string
	readonly fieldErrors: Record<string, string>

	constructor(
		kind: ApiErrorKind,
		options: {
			status?: number
			title?: string
			detail?: string
			fieldErrors?: Record<string, string>
		} = {},
	) {
		super(options.title ?? kind)
		this.name = 'ApiError'
		this.kind = kind
		this.status = options.status
		this.title = options.title
		this.detail = options.detail
		this.fieldErrors = options.fieldErrors ?? {}
	}
}

type ProblemDetail = {
	title: string
	status: number
	detail?: unknown
	errors?: unknown
}

/** `ProblemDetail` é o JSON com `title` e `status`; o resto é opcional. */
function isProblemDetail(body: unknown): body is ProblemDetail {
	return (
		typeof body === 'object' &&
		body !== null &&
		typeof (body as ProblemDetail).title === 'string' &&
		typeof (body as ProblemDetail).status === 'number'
	)
}

function fieldErrorsOf(errors: unknown): Record<string, string> {
	const result: Record<string, string> = {}
	if (!Array.isArray(errors)) return result
	for (const entry of errors) {
		const { field, message } = (entry ?? {}) as Record<string, unknown>
		// Fica a primeira mensagem de cada campo.
		if (typeof field === 'string' && typeof message === 'string') {
			result[field] ??= message
		}
	}
	return result
}

const kindByStatus: Record<number, ApiErrorKind> = {
	400: 'validation',
	401: 'unauthorized',
	403: 'forbidden',
	404: 'not-found',
	409: 'conflict',
}

/** Converte uma resposta de erro (corpo já lido pelo openapi-fetch). */
export function toApiError(status: number, body: unknown): ApiError {
	const kind = kindByStatus[status]
	if (!kind || !isProblemDetail(body)) {
		return new ApiError('unavailable', { status })
	}
	return new ApiError(kind, {
		status,
		title: body.title,
		detail: typeof body.detail === 'string' ? body.detail : undefined,
		fieldErrors: kind === 'validation' ? fieldErrorsOf(body.errors) : {},
	})
}

/**
 * Espera uma chamada do cliente e devolve os dados, ou lança `ApiError`.
 * Falha de rede e timeout viram `unavailable`.
 */
export async function unwrap<T>(
	call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
	let result: Awaited<typeof call>
	try {
		result = await call
	} catch {
		throw new ApiError('unavailable')
	}
	if (!result.response.ok) {
		throw toApiError(result.response.status, result.error)
	}
	return result.data as T
}

/**
 * Mensagem geral para a interface. Não repassa nada de `5xx`. Um `400` sem
 * `detail` com erros por campo não tem mensagem geral: os erros já aparecem
 * junto aos campos.
 */
export function messageFor(error: ApiError): string | undefined {
	switch (error.kind) {
		case 'unavailable':
			return messages.unavailable
		case 'forbidden':
			return messages.forbidden
		case 'unauthorized':
			return messages.sessionExpired
		case 'validation':
			if (error.detail) return error.detail
			return Object.keys(error.fieldErrors).length > 0
				? undefined
				: messages.validation
		case 'not-found':
			return error.detail ?? messages.notFound
		case 'conflict':
			return error.detail ?? messages.conflict
	}
}

/** Resultado serializável de um formulário que falhou. */
export type FormError = {
	kind: ApiErrorKind
	message?: string
	fieldErrors: Record<string, string>
}

export function toFormError(error: unknown): FormError {
	const apiError =
		error instanceof ApiError ? error : new ApiError('unavailable')
	return {
		kind: apiError.kind,
		message: messageFor(apiError),
		fieldErrors: apiError.fieldErrors,
	}
}
