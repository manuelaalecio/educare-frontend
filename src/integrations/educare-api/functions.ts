import { createServerFn } from '@tanstack/react-start'
import {
	fetchSession,
	performChangePassword,
	performLogin,
	performLogout,
} from './auth'
import { createApiClient } from './client'
import { authenticated } from './middleware'
import { requestCookies } from './request'
import { changePasswordSchema, loginSchema } from './validation'

// Server functions: só ligam a lógica de `auth.ts` ao Start. O token fica no
// cookie `httpOnly` e nunca aparece no que estas funções devolvem.

export const login = createServerFn({ method: 'POST' })
	.validator(loginSchema)
	.handler(({ data }) =>
		performLogin({ api: createApiClient(), cookies: requestCookies }, data),
	)

export const logout = createServerFn({ method: 'POST' }).handler(() =>
	performLogout({ cookies: requestCookies }),
)

export const getCurrentUser = createServerFn({ method: 'POST' }).handler(() =>
	fetchSession({ api: createApiClient, cookies: requestCookies }),
)

export const changeOwnPassword = createServerFn({ method: 'POST' })
	.middleware([authenticated])
	.validator(changePasswordSchema)
	.handler(({ data, context }) =>
		performChangePassword({ api: createApiClient(context.token) }, data),
	)
