import { createFileRoute } from '@tanstack/react-router'
import { UnderConstruction } from '#/components/layout/under-construction'

// Provisória: a change da área substitui esta página.
export const Route = createFileRoute('/_authenticated/configuracoes')({
	head: () => ({ meta: [{ title: 'Configurações · Educare' }] }),
	component: ConfiguracoesPage,
})

function ConfiguracoesPage() {
	return <UnderConstruction title='Configurações' />
}
