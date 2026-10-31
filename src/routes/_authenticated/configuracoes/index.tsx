import { createFileRoute, redirect } from '@tanstack/react-router'

// `/configuracoes` abre a primeira aba. O layout já barrou quem não é ADMIN.
export const Route = createFileRoute('/_authenticated/configuracoes/')({
	beforeLoad: () => {
		throw redirect({ to: '/configuracoes/usuarios', replace: true })
	},
})
