import { useRouterState } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { ThemeToggle } from '#/components/theme/theme-toggle'
import { Button } from '#/components/ui/button'
import { Separator } from '#/components/ui/separator'
import { useSidebar } from '#/components/ui/sidebar'
import type { CurrentUser } from '#/integrations/educare-api/auth'
import { pageTitle } from './nav-items'
import { SidebarCollapseButton } from './sidebar-collapse-button'
import { UserMenu } from './user-menu'

// Desktop e celular são decididos por CSS (`md:`), não por `useIsMobile`, para
// o HTML do servidor já sair certo nas duas larguras.
export function AppHeader({ user }: { user: CurrentUser }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname })
	const { setOpenMobile } = useSidebar()

	return (
		<header className='relative z-5 flex h-16 shrink-0 items-center gap-2 border-b px-2 md:px-4'>
			<div className='flex items-center gap-1 md:hidden'>
				<Button
					variant='ghost'
					size='icon'
					className='size-11'
					aria-label='Abrir menu'
					onClick={() => setOpenMobile(true)}
				>
					<Menu className='size-[22px]' />
				</Button>
				<span className='text-lg font-extrabold tracking-tight'>Educare</span>
			</div>
			<div className='hidden items-center gap-2 md:flex'>
				<SidebarCollapseButton />
				<Separator
					orientation='vertical'
					className='data-[orientation=vertical]:h-5'
				/>
				<span className='pl-2 text-[15px] font-bold'>
					{pageTitle(pathname)}
				</span>
			</div>
			<div className='ml-auto flex items-center gap-1'>
				<ThemeToggle className='size-11' />
				<UserMenu user={user} />
			</div>
		</header>
	)
}
