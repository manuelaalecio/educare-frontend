import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { logout } from '#/integrations/educare-api/functions'

/** Logout usado pelo "Sair" da barra lateral e do menu do usuário. */
export function useSignOut() {
	const queryClient = useQueryClient()
	const router = useRouter()
	const navigate = useNavigate()
	const logoutFn = useServerFn(logout)
	const [pending, setPending] = useState(false)

	async function signOut() {
		if (pending) return
		setPending(true)
		try {
			await logoutFn()
			queryClient.clear()
			// Vai ao login antes de invalidar, para não voltar com `?redirect=`.
			await navigate({ to: '/login' })
			await router.invalidate()
		} finally {
			setPending(false)
		}
	}

	return { signOut, pending }
}
