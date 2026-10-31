type FieldError = string | { message?: string } | undefined

/** Primeira mensagem de erro de um campo do TanStack Form. */
export function firstError(errors: FieldError[]) {
	const [error] = errors
	return typeof error === 'string' ? error : error?.message
}

/** `aria-describedby` com os ids que existem. */
export function describedBy(...ids: (string | undefined)[]) {
	return ids.filter(Boolean).join(' ') || undefined
}
