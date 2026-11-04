import { useServerFn } from '@tanstack/react-start'
import {
	createClassroom,
	deleteClassroom,
	renameClassroom,
} from '#/integrations/educare-api/functions'
import { invalidates } from '#/integrations/educare-api/invalidation'
import type {
	ClassroomNameValues,
	RenameClassroomValues,
} from '#/integrations/educare-api/validation'
import { useFormMutation } from '../form-mutation'

// Gravações de turmas. O que cada uma invalida está na tabela `invalidates`;
// nenhum `invalidateQueries` aqui nem na aba.

export function useCreateClassroom() {
	const createFn = useServerFn(createClassroom)
	return useFormMutation(
		(values: ClassroomNameValues) => createFn({ data: values }),
		invalidates.createClassroom,
	)
}

export function useRenameClassroom() {
	const renameFn = useServerFn(renameClassroom)
	return useFormMutation(
		(values: RenameClassroomValues) => renameFn({ data: values }),
		invalidates.renameClassroom,
	)
}

export function useDeleteClassroom() {
	const deleteFn = useServerFn(deleteClassroom)
	return useFormMutation(
		(id: string) => deleteFn({ data: { id } }),
		invalidates.deleteClassroom,
	)
}
