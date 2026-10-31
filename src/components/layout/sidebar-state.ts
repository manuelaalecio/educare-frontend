import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'
import { SIDEBAR_COOKIE_NAME } from '#/components/ui/sidebar'

export const SIDEBAR_COOKIE = SIDEBAR_COOKIE_NAME

/** No navegador: a barra só começa recolhida com `sidebar_state=false`. */
export function sidebarOpenFromCookies(cookies: string) {
	return !cookies.split(/;\s*/).includes(`${SIDEBAR_COOKIE}=false`)
}

/**
 * Estado da barra lateral gravado pelo `SidebarProvider`. Lido também no
 * servidor, para o HTML já vir com a barra no estado certo. Sem cookie, aberta.
 */
export const readSidebarOpen = createIsomorphicFn()
	.server(() => getCookie(SIDEBAR_COOKIE) !== 'false')
	.client(() => sidebarOpenFromCookies(document.cookie))
