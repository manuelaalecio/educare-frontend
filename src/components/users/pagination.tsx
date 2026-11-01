import { Button } from '#/components/ui/button'
import type { UsersPage } from '#/integrations/educare-api/users'
import { rangeLabel } from './format'

type Props = {
	page: UsersPage
	/** Usuários na página atual. */
	shown: number
	/** Desabilita os botões enquanto uma página é buscada. */
	busy: boolean
	onPrevious: () => void
	onNext: () => void
}

/** "Mostrando X–Y de Z" com "Anterior" e "Próxima". */
export function Pagination({ page, shown, busy, onPrevious, onNext }: Props) {
	const isFirst = page.number <= 0
	const isLast = page.number >= page.totalPages - 1
	return (
		<div className='flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground md:px-6'>
			<span>
				{rangeLabel(page.number, page.size, shown, page.totalElements)}
			</span>
			<div className='flex gap-2'>
				<Button
					type='button'
					variant='outline'
					className='h-11'
					disabled={busy || isFirst}
					onClick={onPrevious}
				>
					Anterior
				</Button>
				<Button
					type='button'
					variant='outline'
					className='h-11'
					disabled={busy || isLast}
					onClick={onNext}
				>
					Próxima
				</Button>
			</div>
		</div>
	)
}
