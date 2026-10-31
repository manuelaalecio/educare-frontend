import { describe, expect, it } from 'vitest'
import { createAppEnv } from './env'

function serverEnv(vars: Record<string, string | undefined>) {
	return createAppEnv(vars, { isServer: true })
}

describe('createAppEnv', () => {
	it('Produção com URL https: inicia normalmente', () => {
		const env = serverEnv({
			NODE_ENV: 'production',
			EDUCARE_API_URL: 'https://api.educare.example',
		})
		expect(env.EDUCARE_API_URL).toBe('https://api.educare.example')
	})

	it('Produção com URL http: falha citando EDUCARE_API_URL', () => {
		expect(() =>
			serverEnv({
				NODE_ENV: 'production',
				EDUCARE_API_URL: 'http://129.153.10.20',
			}),
		).toThrow(/EDUCARE_API_URL/)
	})

	it('Variável ausente: falha citando EDUCARE_API_URL', () => {
		expect(() => serverEnv({ NODE_ENV: 'development' })).toThrow(
			/EDUCARE_API_URL/,
		)
		expect(() =>
			serverEnv({ NODE_ENV: 'production', EDUCARE_API_URL: '' }),
		).toThrow(/EDUCARE_API_URL/)
	})

	it('URL inválida: falha citando EDUCARE_API_URL', () => {
		expect(() =>
			serverEnv({ NODE_ENV: 'development', EDUCARE_API_URL: 'localhost' }),
		).toThrow(/EDUCARE_API_URL/)
	})

	it('Desenvolvimento com http local: inicia normalmente', () => {
		const env = serverEnv({
			NODE_ENV: 'development',
			EDUCARE_API_URL: 'http://localhost:8080',
		})
		expect(env.EDUCARE_API_URL).toBe('http://localhost:8080')
	})
})
