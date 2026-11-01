import { Link, useRouterState } from '@tanstack/react-router'
import { LogOut, Sprout, X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '#/components/ui/sidebar'
import type { CurrentUser } from '#/integrations/educare-api/auth'
import {
	footerNav,
	isActive,
	mainNav,
	type NavItem,
	visibleItems,
} from './nav-items'
import { useSignOut } from './use-sign-out'

export function AppSidebar({ user }: { user: CurrentUser }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname })
	const { isMobile, setOpenMobile } = useSidebar()
	const { signOut, pending } = useSignOut()
	const closeMobile = () => setOpenMobile(false)

	return (
		<Sidebar collapsible='icon'>
			<nav aria-label='Menu principal' className='flex h-full flex-col gap-6'>
				<SidebarHeader className='px-3 pt-4 pb-0'>
					<div className='flex min-h-11 items-center gap-2.5 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'>
						<span className='flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary text-primary-foreground'>
							<Sprout aria-hidden='true' className='size-5' />
						</span>
						<span className='flex-1 text-xl font-extrabold tracking-tight group-data-[collapsible=icon]:hidden'>
							Educare
						</span>
						{isMobile && (
							<Button
								variant='ghost'
								size='icon'
								className='size-11'
								aria-label='Fechar menu'
								onClick={closeMobile}
							>
								<X className='size-5' />
							</Button>
						)}
					</div>
				</SidebarHeader>

				<SidebarContent className='px-1'>
					<SidebarGroup className='py-0'>
						<SidebarGroupLabel className='px-3 text-xs font-bold tracking-wider text-muted-foreground uppercase'>
							Menu
						</SidebarGroupLabel>
						<SidebarMenu>
							{visibleItems(mainNav, user.role).map((item) => (
								<NavLink
									key={item.to}
									item={item}
									pathname={pathname}
									onNavigate={closeMobile}
								/>
							))}
						</SidebarMenu>
					</SidebarGroup>
				</SidebarContent>

				<SidebarFooter className='mx-3 border-t border-sidebar-border px-0 pt-4 pb-4'>
					<SidebarMenu>
						{visibleItems(footerNav, user.role).map((item) => (
							<NavLink
								key={item.to}
								item={item}
								pathname={pathname}
								onNavigate={closeMobile}
							/>
						))}
						<SidebarMenuItem>
							<SidebarMenuButton
								tooltip='Sair'
								aria-label='Sair'
								disabled={pending}
								onClick={signOut}
							>
								<LogOut aria-hidden='true' />
								<span>Sair</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
			</nav>
		</Sidebar>
	)
}

function NavLink({
	item,
	pathname,
	onNavigate,
}: {
	item: NavItem
	pathname: string
	onNavigate: () => void
}) {
	const Icon = item.icon
	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				asChild
				isActive={isActive(item, pathname)}
				tooltip={item.title}
			>
				{/* O Link põe `aria-current="page"` com a mesma regra de `isActive`. */}
				<Link
					to={item.to}
					activeOptions={{ exact: item.exact, includeSearch: false }}
					aria-label={item.title}
					onClick={onNavigate}
				>
					<Icon aria-hidden='true' />
					<span>{item.title}</span>
				</Link>
			</SidebarMenuButton>
		</SidebarMenuItem>
	)
}
