import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '#/components/ui/button'
import { updatedAtLabel } from './format'

type Props = {
	/** `dataUpdatedAt` da consulta mostrada. */
	updatedAt: number
	refreshing: boolean
	onRefresh: () => void
}

/** "Atualizado agora" / "Atualizado há N min" e o botão "Atualizar". */
export function UpdatedAt({ updatedAt, refreshing, onRefresh }: Props) {
	// Começa em `updatedAt` para o SSR e a hidratação escreverem o mesmo texto;
	// depois acompanha o relógio a cada 30 s.
	const [now, setNow] = useState(updatedAt)
	useEffect(() => {
		setNow(Math.max(Date.now(), updatedAt))
		const timer = setInterval(() => setNow(Date.now()), 30_000)
		return () => clearInterval(timer)
	}, [updatedAt])

	return (
		<div className='flex items-center gap-2 text-sm text-muted-foreground'>
			<span aria-live='polite'>{updatedAtLabel(updatedAt, now)}</span>
			<Button
				type='button'
				variant='ghost'
				className='h-11'
				disabled={refreshing}
				onClick={onRefresh}
			>
				<RefreshCw aria-hidden='true' className='size-4' />
				Atualizar
			</Button>
		</div>
	)
}
