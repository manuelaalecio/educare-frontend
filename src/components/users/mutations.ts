import { useServerFn } from '@tanstack/react-start'
import {
	createUser,
	deleteUser,
	resetUserPassword,
	updateUser,
} from '#/integrations/educare-api/functions'
import { invalidates } from '#/integrations/educare-api/invalidation'
import type {
	CreateUserValues,
	ResetPasswordValues,
	UpdateUserValues,
} from '#/integrations/educare-api/validation'
import { useFormMutation } from '../form-mutation'

// Gravações de usuários. O que cada uma invalida está na tabela `invalidates`;
// a aba só recarrega a sessão quando o usuário editado é o da sessão.

export function useCreateUser() {
	const createFn = useServerFn(createUser)
	return useFormMutation(
		(values: CreateUserValues) => createFn({ data: values }),
		invalidates.createUser,
	)
}

export function useUpdateUser() {
	const updateFn = useServerFn(updateUser)
	return useFormMutation(
		(values: UpdateUserValues) => updateFn({ data: values }),
		invalidates.updateUser,
	)
}

export function useResetUserPassword() {
	const resetFn = useServerFn(resetUserPassword)
	return useFormMutation(
		(values: ResetPasswordValues) => resetFn({ data: values }),
		invalidates.resetUserPassword,
	)
}

export function useDeleteUser() {
	const deleteFn = useServerFn(deleteUser)
	return useFormMutation(
		(id: string) => deleteFn({ data: { id } }),
		invalidates.deleteUser,
	)
}
