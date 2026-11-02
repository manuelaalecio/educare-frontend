import { type AnyRouteMatch, Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'

export const NOT_FOUND_TITLE = 'Página não encontrada · Educare'

/**
 * Diz se a navegação atual caiu numa página não encontrada: um endereço sem
 * rota ou um `notFound()` lançado. Usado pelo `head` da raiz para o título da aba.
 */
export function isNotFound(matches: AnyRouteMatch[]) {
	return matches.some((match) => match._notFound || match.status === 'notFound')
}

/** Página de um endereço que não existe (`defaultNotFoundComponent`). */
export function NotFound() {
	return (
		<main className='p-4 md:p-8'>
			<h1 className='text-2xl font-extrabold tracking-tight text-foreground md:text-3xl'>
				Página não encontrada
			</h1>
			<p className='mt-2 text-muted-foreground'>
				O endereço que você abriu não existe ou mudou.
			</p>
			<Button asChild className='mt-6'>
				<Link to='/'>Voltar ao início</Link>
			</Button>
		</main>
	)
}
