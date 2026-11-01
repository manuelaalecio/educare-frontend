import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppHeader } from '#/components/layout/app-header'
import { AppSidebar } from '#/components/layout/app-sidebar'
import { readSidebarOpen } from '#/components/layout/sidebar-state'
import { SidebarInset, SidebarProvider } from '#/components/ui/sidebar'
import { preventCaching } from '#/integrations/educare-api/cache'
import { currentUserQuery } from '#/integrations/educare-api/queries'
import { SESSION_EXPIRED } from '#/integrations/educare-api/session'

// Layout das páginas protegidas: toda rota em `_authenticated/` exige sessão
// e ganha a barra lateral e o cabeçalho.
export const Route = createFileRoute('/_authenticated')({
	beforeLoad: async ({ context, location }) => {
		preventCaching()
		const session = await context.queryClient.fetchQuery(currentUserQuery)
		if (!session.user) {
			throw redirect({
				to: '/login',
				search: {
					redirect: location.href,
					motivo: session.expired ? SESSION_EXPIRED : undefined,
				},
			})
		}
		return { user: session.user, sidebarOpen: readSidebarOpen() }
	},
	component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
	const { user, sidebarOpen } = Route.useRouteContext()
	return (
		<SidebarProvider defaultOpen={sidebarOpen}>
			<AppSidebar user={user} />
			<SidebarInset>
				<AppHeader user={user} />
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	)
}
