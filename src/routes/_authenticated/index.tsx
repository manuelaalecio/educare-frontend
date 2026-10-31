import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/')({ component: Home })

function Home() {
	const { user } = Route.useRouteContext()
	return (
		<main className='p-8'>
			<h1 className='text-3xl font-bold text-foreground'>
				Bem-vindo(a), {user.name}
			</h1>
			<p className='mt-4 text-lg text-muted-foreground'>
				Sistema de gestão escolar.
			</p>
		</main>
	)
}
