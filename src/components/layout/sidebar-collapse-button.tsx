import { PanelLeft } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useSidebar } from '#/components/ui/sidebar'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '#/components/ui/tooltip'

/** Recolhe e expande a barra no desktop (o `SidebarTrigger` tem rótulo fixo em inglês). */
export function SidebarCollapseButton() {
	const { state, toggleSidebar } = useSidebar()
	const label = state === 'expanded' ? 'Recolher menu' : 'Expandir menu'

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant='ghost'
					size='icon'
					className='size-11'
					aria-label={label}
					onClick={toggleSidebar}
				>
					<PanelLeft className='size-5' />
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}
