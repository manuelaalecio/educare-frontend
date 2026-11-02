import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import type { ChildCollectionProps } from './child-table'
import { ageLabel } from './format'

/** Cartões de crianças no celular (abaixo de 768 px): o cartão é o link. */
export function ChildCards({ items, today }: ChildCollectionProps) {
	return (
		<ul aria-label='Crianças' className='md:hidden'>
			{items.map((child) => (
				<li key={child.id} className='border-t'>
					<Link
						to='/criancas/$childId'
						params={{ childId: child.id }}
						className='flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50'
					>
						<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
							<span className='truncate text-sm font-bold'>{child.name}</span>
							<span className='truncate text-xs text-muted-foreground'>
								{ageLabel(child.birthDate, today)} · {child.classroom.name}
							</span>
						</div>
						<ChevronRight
							aria-hidden='true'
							className='size-[18px] shrink-0 text-muted-foreground'
						/>
					</Link>
				</li>
			))}
		</ul>
	)
}
