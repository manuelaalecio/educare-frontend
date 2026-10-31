import {
	Contact,
	House,
	LayoutGrid,
	type LucideIcon,
	Settings,
	Users,
} from 'lucide-react'
import type { FileRouteTypes } from '#/routeTree.gen'

export type NavItem = {
	title: string
	to: FileRouteTypes['to']
	icon: LucideIcon
	/** Ativo só no caminho exato (o Início); os demais valem também abaixo dele. */
	exact?: boolean
	/** Roles que veem o item. Sem a lista, todos veem. */
	roles?: string[]
}

/** Itens do grupo "Menu" da barra lateral. */
export const mainNav: NavItem[] = [
	{ title: 'Início', to: '/', icon: House, exact: true },
	{ title: 'Alunos', to: '/alunos', icon: Users },
	{ title: 'Responsáveis', to: '/responsaveis', icon: Contact },
	{ title: 'Turmas', to: '/turmas', icon: LayoutGrid },
]

/** Itens do rodapé da barra lateral, acima de "Sair". */
export const footerNav: NavItem[] = [
	{
		title: 'Configurações',
		to: '/configuracoes',
		icon: Settings,
		roles: ['ADMIN'],
	},
]

export function visibleItems(items: NavItem[], role: string) {
	return items.filter((item) => !item.roles || item.roles.includes(role))
}

export function isActive(item: NavItem, pathname: string) {
	if (item.exact) return pathname === item.to
	return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

/** Título do cabeçalho para a página atual. */
export function pageTitle(pathname: string) {
	const item = [...mainNav, ...footerNav].find((nav) => isActive(nav, pathname))
	if (item) return item.title
	if (pathname === '/minha-conta' || pathname.startsWith('/minha-conta/')) {
		return 'Minha conta'
	}
	return 'Educare'
}
