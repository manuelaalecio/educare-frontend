// @vitest-environment node
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const run = promisify(execFile)
const SCRIPT = join(import.meta.dirname, 'generate-api-types.mjs')

const CONTRACT = {
	openapi: '3.1.0',
	info: { title: 'Educare', version: '1' },
	paths: {
		'/api/v1/auth/me': {
			get: {
				responses: {
					'200': {
						description: 'ok',
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['id', 'name'],
									properties: {
										id: { type: 'integer' },
										name: { type: 'string' },
									},
								},
							},
						},
					},
				},
			},
		},
	},
}

let dir: string
let output: string

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), 'api-generate-'))
	output = join(dir, 'schema.gen.ts')
})

afterEach(async () => {
	await rm(dir, { recursive: true, force: true })
})

async function generate(env: Record<string, string>) {
	const { API_CONTRACT: _, ...processEnv } = process.env
	try {
		await run('node', [SCRIPT], {
			env: { ...processEnv, API_TYPES_OUTPUT: output, ...env },
		})
		return 0
	} catch (error) {
		return (error as { code: number }).code
	}
}

describe('generate-api-types', () => {
	it('Contrato local: gera os tipos a partir do arquivo', async () => {
		const contract = join(dir, 'educare-api.json')
		await writeFile(contract, JSON.stringify(CONTRACT))

		expect(await generate({ API_CONTRACT: contract })).toBe(0)

		const types = await readFile(output, 'utf8')
		expect(types).toContain('"/api/v1/auth/me"')
		expect(types).toMatch(/id: number;/)
		expect(types).toMatch(/name: string;/)
	})

	it('Contrato inválido: sai com código 1 e não altera o arquivo', async () => {
		const contract = join(dir, 'educare-api.json')
		await writeFile(contract, '<html>não é JSON</html>')
		await writeFile(output, '// tipos antigos\n')

		expect(await generate({ API_CONTRACT: contract })).toBe(1)
		expect(await readFile(output, 'utf8')).toBe('// tipos antigos\n')
	})

	it('Falha no download: sai com código 1 e não altera o arquivo', async () => {
		await writeFile(output, '// tipos antigos\n')

		expect(
			await generate({
				API_CONTRACT_URL: 'http://127.0.0.1:9/educare-api.json',
			}),
		).toBe(1)
		expect(await readFile(output, 'utf8')).toBe('// tipos antigos\n')
	})
})
