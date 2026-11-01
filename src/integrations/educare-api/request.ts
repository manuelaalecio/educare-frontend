import {
	deleteCookie,
	getCookie,
	getRequest,
	setCookie,
} from '@tanstack/react-start/server'
import {
	SESSION_COOKIE,
	type SessionCookies,
	sessionCookieOptions,
} from './session'

// Acesso à requisição atual. Só funciona dentro de handlers de servidor, e só
// deve ser importado por eles (o compilador do Start tira o import do bundle
// do navegador junto com o handler).

const isProduction = process.env.NODE_ENV === 'production'

/** Cookie de sessão da requisição atual. */
export const requestCookies: SessionCookies = {
	get: () => getCookie(SESSION_COOKIE),
	set: (token, maxAge) =>
		setCookie(
			SESSION_COOKIE,
			token,
			sessionCookieOptions(isProduction, maxAge),
		),
	clear: () => deleteCookie(SESSION_COOKIE, sessionCookieOptions(isProduction)),
}

export function requestPath() {
	const url = new URL(getRequest().url)
	return url.pathname + url.search
}
