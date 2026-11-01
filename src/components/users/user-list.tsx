import { RoleBadge, SelfBadge, UserAvatar } from './role-badge'
import { UserActions } from './user-actions'
import type { UserCollectionProps } from './user-table'

/** Cards de usuários no celular (abaixo de 768 px). */
export function UserList({
	users,
	currentUserId,
	...actions
}: UserCollectionProps) {
	return (
		<ul aria-label='Usuários' className='md:hidden'>
			{users.map((user) => {
				const isSelf = user.id === currentUserId
				return (
					<li key={user.id} className='flex flex-col gap-2 border-t px-4 py-3'>
						<div className='flex min-w-0 items-center gap-3'>
							<UserAvatar name={user.name} />
							<div className='flex min-w-0 flex-col gap-0.5'>
								<span className='truncate text-sm font-bold'>{user.name}</span>
								<span className='truncate text-xs text-muted-foreground'>
									{user.login}
								</span>
							</div>
						</div>
						<div className='flex items-center justify-between gap-3'>
							<div className='flex flex-wrap items-center gap-1.5'>
								<RoleBadge role={user.role} />
								{isSelf && <SelfBadge />}
							</div>
							<UserActions user={user} isSelf={isSelf} {...actions} />
						</div>
					</li>
				)
			})}
		</ul>
	)
}
