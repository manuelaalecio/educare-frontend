import { createFileRoute } from '@tanstack/react-router'
import {
	ClassroomsPending,
	ClassroomsSection,
} from '#/components/classrooms/classrooms-section'
import { classroomsQuery, loadQuery } from '#/integrations/educare-api/queries'

// A lista vem no `loader`: no F5 a aba chega do servidor com as turmas, e o
// navegador reaproveita o que veio no HTML.
export const Route = createFileRoute('/_authenticated/configuracoes/turmas')({
	loader: ({ context: { queryClient } }) =>
		loadQuery(queryClient, classroomsQuery),
	head: () => ({ meta: [{ title: 'Turmas · Configurações · Educare' }] }),
	pendingComponent: ClassroomsPending,
	component: ClassroomsSection,
})
