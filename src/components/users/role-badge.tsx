import { cn } from 'cn'
import { initials, roleLabel } from '#/components/layout/user'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { COORDINATOR_ROLE } from '#/integrations/educare-api/validation'

const badge = 'rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap'

/** Selo da função: verde para Coordenador(a), neutro para as outras. */
export function RoleBadge({ role }: { role: string }) {
	return (
		<span
			className={cn(
				badge,
				role === COORDINATOR_ROLE
					? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
					: 'bg-sage-100 text-sage-700 dark:bg-sage-800 dark:text-sage-300',
			)}
		>
			{roleLabel(role)}
		</span>
	)
}

/** Selo "Você", na linha do usuário da sessão. */
export function SelfBadge() {
	return (
		<span
			className={cn(
				badge,
				'bg-sage-100 text-sage-700 dark:bg-sage-800 dark:text-sage-300',
			)}
		>
			Você
		</span>
	)
}

/** Avatar com as iniciais; o nome já aparece ao lado. */
export function UserAvatar({
	name,
	className,
}: {
	name: string
	className?: string
}) {
	return (
		<Avatar aria-hidden='true' className={cn('size-9', className)}>
			<AvatarFallback className='bg-sage-200 text-xs font-extrabold text-sage-700 dark:bg-sage-800 dark:text-sage-300'>
				{initials(name)}
			</AvatarFallback>
		</Avatar>
	)
}
