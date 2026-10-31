import { createFileRoute } from '@tanstack/react-router'
import { ClassroomsSection } from '#/components/classrooms/classrooms-section'

export const Route = createFileRoute('/_authenticated/configuracoes/turmas')({
	head: () => ({ meta: [{ title: 'Turmas · Configurações · Educare' }] }),
	component: ClassroomsSection,
})
