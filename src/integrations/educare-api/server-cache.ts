// Só no servidor: o build falha se este módulo entrar no bundle do navegador.
import '@tanstack/react-start/server-only'
import { createHash } from 'node:crypto'
import { shouldInvalidate, type Tag } from './invalidation'

/**
 * Cache curto das leituras da API no servidor do front, só em memória.
 *
 * - Cada entrada pertence a uma sessão (o hash do token) e a um recurso (tag).
 *   Uma sessão nunca recebe o que foi buscado com o token de outra.
 * - Só guarda resultados `{ ok: true }`; erros passam direto.
 * - `invalidate` limpa as tags para todas as sessões: a gravação de uma
 *   pessoa vale para todo mundo.
 * - Cada instância do servidor tem o próprio cache (na Vercel, uma gravação
 *   em outra instância aparece depois do TTL).
 * - Nada de chave, filtro, id, token ou dado no log: só a tag do acerto.
 */
export type ServerCache = ReturnType<typeof createServerCache>

type Entry = {
	session: string
	tag: Tag
	value: unknown
	expiresAt: number
}

export function createServerCache({
	ttlMs = 30_000,
	maxEntries = 500,
	now = Date.now,
	log = (line: string) => console.info(line),
}: {
	ttlMs?: number
	maxEntries?: number
	now?: () => number
	log?: (line: string) => void
} = {}) {
	// O `Map` guarda a ordem de inserção: a primeira entrada é a usada há mais
	// tempo, porque um acerto apaga e insere de novo.
	const entries = new Map<string, Entry>()
	// Uma leitura que começou antes de uma gravação não guarda o que trouxe.
	const generations = new Map<Tag, number>()
	const generation = (tag: Tag) => generations.get(tag) ?? 0

	return {
		async read<T extends { ok: boolean }>(
			session: string,
			tag: Tag,
			key: string,
			load: () => Promise<T>,
		): Promise<T> {
			const id = `${session}\u0000${tag}\u0000${key}`
			const cached = entries.get(id)
			if (cached && cached.expiresAt > now()) {
				entries.delete(id)
				entries.set(id, cached)
				log(`[educare-api] cache ${tag} hit`)
				return cached.value as T
			}
			if (cached) entries.delete(id)

			const startedAt = generation(tag)
			const result = await load()
			if (result.ok && generation(tag) === startedAt) {
				entries.set(id, {
					session,
					tag,
					value: result,
					expiresAt: now() + ttlMs,
				})
				while (entries.size > maxEntries) {
					const oldest = entries.keys().next().value
					if (oldest === undefined) break
					entries.delete(oldest)
				}
			}
			return result
		},

		invalidate(tags: readonly Tag[]) {
			for (const tag of tags) generations.set(tag, generation(tag) + 1)
			for (const [id, entry] of entries) {
				if (tags.includes(entry.tag)) entries.delete(id)
			}
		},

		clearSession(session: string) {
			for (const [id, entry] of entries) {
				if (entry.session === session) entries.delete(id)
			}
		},

		get size() {
			return entries.size
		},
	}
}

/** Identifica a sessão pelo token inteiro, sem guardar o token. */
export function sessionOf(token: string) {
	return createHash('sha256').update(token).digest('hex')
}

export const serverCache = createServerCache()

/** Descarta o que a sessão deste token guardou (logout, troca de senha, `401`). */
export function forgetSession(token: string) {
	serverCache.clearSession(sessionOf(token))
}

/**
 * Depois de uma gravação: limpa as tags quando ela deu certo ou quando o
 * registro já não existia (`404`), para todas as sessões. Devolve o resultado.
 */
export function afterWrite<
	T extends { ok: true } | { ok: false; kind: string },
>(
	result: T,
	tags: readonly Tag[],
	cache: Pick<ServerCache, 'invalidate'> = serverCache,
): T {
	if (shouldInvalidate(result)) cache.invalidate(tags)
	return result
}
