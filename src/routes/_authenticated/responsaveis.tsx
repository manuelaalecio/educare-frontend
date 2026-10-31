import { createFileRoute } from '@tanstack/react-router'
import { UnderConstruction } from '#/components/layout/under-construction'

// Provisória: a change da área substitui esta página.
export const Route = createFileRoute('/_authenticated/responsaveis')({
	head: () => ({ meta: [{ title: 'Responsáveis · Educare' }] }),
	component: ResponsaveisPage,
})

function ResponsaveisPage() {
	return <UnderConstruction title='Responsáveis' />
}
