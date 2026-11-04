// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { afterWrite, createServerCache, sessionOf } from './server-cache'

const ok = (value: string) => ({ ok: true as const, value })

function setup(options: { maxEntries?: number } = {}) {
	let time = 1_000_000
	const log = vi.fn()
	const cache = createServerCache({
		now: () => time,
		log,
		...options,
	})
	const advance = (ms: number) => {
		time += ms
	}
	return { cache, log, advance }
}

describe('createServerCache', () => {
	it('responde do cache dentro de 30 s, sem chamar a API', async () => {
		const { cache, advance } = setup()
		const load = vi.fn(async () => ok('turmas'))
		await cache.read('s1', 'classrooms', 'list', load)
		advance(29_999)
		await expect(cache.read('s1', 'classrooms', 'list', load)).resolves.toEqual(
			ok('turmas'),
		)
		expect(load).toHaveBeenCalledTimes(1)
	})

	it('busca de novo depois de 30 s', async () => {
		const { cache, advance } = setup()
		const load = vi.fn(async () => ok('turmas'))
		await cache.read('s1', 'classrooms', 'list', load)
		advance(30_001)
		await cache.read('s1', 'classrooms', 'list', load)
		expect(load).toHaveBeenCalledTimes(2)
	})

	it('não guarda erro nem { ok: false }', async () => {
		const { cache } = setup()
		const failing = vi.fn(async () => ({ ok: false as const }))
		await cache.read('s1', 'classrooms', 'list', failing)
		await cache.read('s1', 'classrooms', 'list', failing)
		expect(failing).toHaveBeenCalledTimes(2)

		const throwing = vi.fn(async () => {
			throw new Error('indisponível')
		})
		await expect(cache.read('s1', 'users', 'list', throwing)).rejects.toThrow()
		await expect(cache.read('s1', 'users', 'list', throwing)).rejects.toThrow()
		expect(throwing).toHaveBeenCalledTimes(2)
		expect(cache.size).toBe(0)
	})

	it('separa as sessões', async () => {
		const { cache } = setup()
		await cache.read('ana', 'users', 'list', async () => ok('de Ana'))
		const load = vi.fn(async () => ok('de Bruno'))
		await expect(cache.read('bruno', 'users', 'list', load)).resolves.toEqual(
			ok('de Bruno'),
		)
		expect(load).toHaveBeenCalledTimes(1)
	})

	it('separa as chaves da mesma tag', async () => {
		const { cache } = setup()
		await cache.read('s1', 'users', 'list:{"page":1}', async () => ok('p1'))
		await expect(
			cache.read('s1', 'users', 'list:{"page":2}', async () => ok('p2')),
		).resolves.toEqual(ok('p2'))
	})

	it('invalidate limpa a tag em todas as sessões e mantém as outras', async () => {
		const { cache } = setup()
		await cache.read('ana', 'classrooms', 'list', async () => ok('a'))
		await cache.read('bruno', 'classrooms', 'list', async () => ok('b'))
		await cache.read('ana', 'users', 'list', async () => ok('u'))

		cache.invalidate(['classrooms'])

		const load = vi.fn(async () => ok('novo'))
		await cache.read('ana', 'classrooms', 'list', load)
		await cache.read('bruno', 'classrooms', 'list', load)
		const users = vi.fn(async () => ok('u2'))
		await expect(cache.read('ana', 'users', 'list', users)).resolves.toEqual(
			ok('u'),
		)
		expect(load).toHaveBeenCalledTimes(2)
		expect(users).not.toHaveBeenCalled()
	})

	it('clearSession limpa só aquela sessão', async () => {
		const { cache } = setup()
		await cache.read('ana', 'users', 'list', async () => ok('a'))
		await cache.read('bruno', 'users', 'list', async () => ok('b'))

		cache.clearSession('ana')

		const ana = vi.fn(async () => ok('a2'))
		const bruno = vi.fn(async () => ok('b2'))
		await cache.read('ana', 'users', 'list', ana)
		await cache.read('bruno', 'users', 'list', bruno)
		expect(ana).toHaveBeenCalledTimes(1)
		expect(bruno).not.toHaveBeenCalled()
	})

	it('descarta a entrada usada há mais tempo além do limite', async () => {
		const { cache } = setup({ maxEntries: 3 })
		for (const key of ['a', 'b', 'c']) {
			await cache.read('s1', 'children', key, async () => ok(key))
		}
		// Um acerto em "a" faz "b" virar a usada há mais tempo.
		await cache.read('s1', 'children', 'a', async () => ok('a2'))
		await cache.read('s1', 'children', 'd', async () => ok('d'))

		expect(cache.size).toBe(3)
		const b = vi.fn(async () => ok('b2'))
		const a = vi.fn(async () => ok('a3'))
		await cache.read('s1', 'children', 'b', b)
		await cache.read('s1', 'children', 'a', a)
		expect(b).toHaveBeenCalledTimes(1)
		expect(a).not.toHaveBeenCalled()
	})

	it('limita a 500 entradas por padrão', async () => {
		const cache = createServerCache({ log: () => {} })
		for (let i = 0; i < 501; i++) {
			await cache.read('s1', 'children', `detail:${i}`, async () => ok('x'))
		}
		expect(cache.size).toBe(500)
	})

	it('não guarda a leitura que terminou depois de uma gravação', async () => {
		const { cache } = setup()
		let finish: (value: ReturnType<typeof ok>) => void = () => {}
		const slow = cache.read(
			's1',
			'classrooms',
			'list',
			() =>
				new Promise<ReturnType<typeof ok>>((resolve) => {
					finish = resolve
				}),
		)
		cache.invalidate(['classrooms'])
		finish(ok('velha'))
		await expect(slow).resolves.toEqual(ok('velha'))

		const load = vi.fn(async () => ok('nova'))
		await expect(cache.read('s1', 'classrooms', 'list', load)).resolves.toEqual(
			ok('nova'),
		)
		expect(load).toHaveBeenCalledTimes(1)
	})

	it('registra o acerto só com a tag', async () => {
		const { cache, log } = setup()
		const key = 'list:{"nome":"joao","pagina":1}'
		await cache.read('s1', 'children', key, async () => ok('Joao Silva'))
		expect(log).not.toHaveBeenCalled()
		await cache.read('s1', 'children', key, async () => ok('x'))
		expect(log).toHaveBeenCalledTimes(1)
		expect(log).toHaveBeenCalledWith('[educare-api] cache children hit')
	})
})

describe('sessionOf', () => {
	it('é o mesmo para o mesmo token e não contém o token', () => {
		const token = 'eyJhbGciOiJIUzI1NiJ9.token-da-sessao'
		expect(sessionOf(token)).toBe(sessionOf(token))
		expect(sessionOf(token)).not.toContain(token)
		expect(sessionOf(token)).not.toBe(sessionOf(`${token}x`))
		expect(sessionOf(token)).toMatch(/^[0-9a-f]{64}$/)
	})
})

describe('afterWrite', () => {
	it('invalida no sucesso e no 404, não no conflito', () => {
		const cache = { invalidate: vi.fn() }
		const done = { ok: true as const }
		expect(afterWrite(done, ['classrooms'], cache)).toBe(done)
		afterWrite({ ok: false, kind: 'not-found' }, ['users'], cache)
		afterWrite({ ok: false, kind: 'conflict' }, ['children'], cache)
		expect(cache.invalidate.mock.calls).toEqual([[['classrooms']], [['users']]])
	})
})
