import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

type RuntimeEnv = Record<string, string | boolean | number | undefined>

/**
 * Cria e valida o ambiente. Separado do `env` exportado para que os testes
 * possam validar combinações de variáveis sem depender do processo atual.
 */
export function createAppEnv(
	runtimeEnv: RuntimeEnv,
	options: { isServer?: boolean } = {},
) {
	const isProduction = runtimeEnv.NODE_ENV === 'production'

	return createEnv({
		server: {
			EDUCARE_API_URL: z
				.url()
				.refine((value) => !isProduction || value.startsWith('https://'), {
					message: 'deve usar https em produção',
				}),
		},

		/**
		 * The prefix that client-side variables must have. This is enforced both at
		 * a type-level and at runtime.
		 */
		clientPrefix: 'VITE_',

		client: {
			VITE_APP_TITLE: z.string().min(1).optional(),
		},

		runtimeEnv,
		isServer: options.isServer,

		/**
		 * By default, this library will feed the environment variables directly to
		 * the Zod validator.
		 *
		 * This means that if you have an empty string for a value that is supposed
		 * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
		 * it as a type mismatch violation. Additionally, if you have an empty string
		 * for a value that is supposed to be a string with a default value (e.g.
		 * `DOMAIN=` in an ".env" file), the default value will never be applied.
		 *
		 * In order to solve these issues, we recommend that all new projects
		 * explicitly specify this option as true.
		 */
		emptyStringAsUndefined: true,

		onValidationError: (issues) => {
			const details = issues
				.map((issue) => `${issue.path?.join('.') ?? '?'}: ${issue.message}`)
				.join('; ')
			throw new Error(`Variáveis de ambiente inválidas: ${details}`)
		},
	})
}

/**
 * No servidor, as variáveis sem `VITE_` vêm do `process.env` em tempo de
 * execução (na Vercel, não existem no build). No navegador só há o
 * `import.meta.env`.
 */
export const env = createAppEnv(
	typeof process === 'undefined'
		? import.meta.env
		: { ...process.env, ...import.meta.env },
)
