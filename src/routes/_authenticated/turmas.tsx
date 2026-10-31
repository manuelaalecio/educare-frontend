import { createFileRoute } from '@tanstack/react-router'
import { UnderConstruction } from '#/components/layout/under-construction'

// Provisória: a change da área substitui esta página.
export const Route = createFileRoute('/_authenticated/turmas')({
	head: () => ({ meta: [{ title: 'Turmas · Educare' }] }),
	component: TurmasPage,
})

function TurmasPage() {
	return <UnderConstruction title='Turmas' />
}
