import { createFileRoute, redirect } from '@tanstack/react-router'

// Endereço antigo da troca de senha: a troca agora é um modal em /minha-conta.
// O layout `_authenticated` checa a sessão antes deste redirect.
export const Route = createFileRoute('/_authenticated/minha-conta/senha')({
	beforeLoad: () => {
		throw redirect({ to: '/minha-conta', replace: true })
	},
})
