import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'

export const CHILD_NOT_FOUND_TITLE = 'Criança não encontrada · Educare'

/**
 * Página de uma criança que não existe (`404` da API ou id inválido), nos
 * detalhes e na edição. O título da aba fica no `head` de cada rota.
 */
export function ChildNotFound() {
	return (
		<main className='p-4 md:p-8'>
			<h1 className='text-2xl font-extrabold tracking-tight text-foreground md:text-3xl'>
				Criança não encontrada
			</h1>
			<p className='mt-2 text-muted-foreground'>
				Ela pode ter sido excluída ou o endereço está errado.
			</p>
			<Button asChild className='mt-6 h-11'>
				<Link to='/criancas'>Voltar para Crianças</Link>
			</Button>
		</main>
	)
}
