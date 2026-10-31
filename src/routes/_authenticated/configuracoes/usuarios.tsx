import { createFileRoute } from '@tanstack/react-router'

// Provisória: a change da aba Usuários substitui esta página.
export const Route = createFileRoute('/_authenticated/configuracoes/usuarios')({
	head: () => ({ meta: [{ title: 'Usuários · Configurações · Educare' }] }),
	component: UsersTab,
})

function UsersTab() {
	return (
		<section
			aria-labelledby='titulo-cfg-usuarios'
			className='flex flex-col gap-1 rounded-xl border bg-card p-6 text-card-foreground'
		>
			<h2 id='titulo-cfg-usuarios' className='text-base font-bold'>
				Usuários
			</h2>
			<p className='text-sm text-muted-foreground'>
				Esta seção ainda está em construção.
			</p>
		</section>
	)
}
