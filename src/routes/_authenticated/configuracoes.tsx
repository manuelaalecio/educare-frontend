import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router'
import { LayoutGrid, type LucideIcon, UserRound } from 'lucide-react'
import type { FileRouteTypes } from '#/routeTree.gen'

// Layout da área Configurações: só ADMIN entra. A checagem roda no servidor,
// antes de qualquer HTML da área, e vale para toda aba nova.
export const Route = createFileRoute('/_authenticated/configuracoes')({
	beforeLoad: ({ context }) => {
		if (context.user.role !== 'ADMIN') {
			throw redirect({ to: '/', replace: true })
		}
	},
	head: () => ({ meta: [{ title: 'Configurações · Educare' }] }),
	component: SettingsLayout,
})

type Tab = { title: string; to: FileRouteTypes['to']; icon: LucideIcon }

const tabs: Tab[] = [
	{ title: 'Usuários', to: '/configuracoes/usuarios', icon: UserRound },
	{ title: 'Turmas', to: '/configuracoes/turmas', icon: LayoutGrid },
]

function SettingsLayout() {
	return (
		<main className='flex flex-col gap-6 p-4 md:p-8'>
			<div>
				<h1 className='text-2xl font-extrabold tracking-tight text-foreground md:text-3xl'>
					Configurações
				</h1>
				<p className='mt-2 text-muted-foreground'>
					Usuários do sistema e turmas da escola. Só administradores acessam
					esta área.
				</p>
			</div>
			<nav
				aria-label='Seções das configurações'
				className='flex flex-wrap gap-1 border-b'
			>
				{tabs.map(({ title, to, icon: Icon }) => (
					<Link
						key={to}
						to={to}
						className='-mb-px flex min-h-11 items-center gap-2 border-b-2 border-transparent px-3.5 text-sm font-bold whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-foreground'
					>
						<Icon aria-hidden='true' className='size-[18px]' />
						{title}
					</Link>
				))}
			</nav>
			<Outlet />
		</main>
	)
}
