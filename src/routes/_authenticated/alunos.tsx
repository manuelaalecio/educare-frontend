import { createFileRoute } from '@tanstack/react-router'
import { UnderConstruction } from '#/components/layout/under-construction'

// Provisória: a change da área substitui esta página.
export const Route = createFileRoute('/_authenticated/alunos')({
	head: () => ({ meta: [{ title: 'Alunos · Educare' }] }),
	component: AlunosPage,
})

function AlunosPage() {
	return <UnderConstruction title='Alunos' />
}
