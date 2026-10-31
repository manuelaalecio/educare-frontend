import { formatCreatedAt } from '#/components/format'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#/components/ui/table'
import type { User } from '#/integrations/educare-api/users'
import { RoleBadge, SelfBadge, UserAvatar } from './role-badge'
import { UserActions, type UserActionsProps } from './user-actions'

export type UserCollectionProps = Omit<UserActionsProps, 'user' | 'isSelf'> & {
	users: User[]
	currentUserId: string
}

const head =
	'h-auto py-2.5 text-xs font-bold tracking-wide text-muted-foreground uppercase'

/** Tabela de usuários, a partir de 768 px. */
export function UserTable({
	users,
	currentUserId,
	...actions
}: UserCollectionProps) {
	return (
		<div className='hidden md:block'>
			<Table aria-label='Usuários' className='table-fixed'>
				<TableHeader className='bg-muted/50'>
					<TableRow className='hover:bg-transparent'>
						<TableHead className={`${head} pl-6`}>Nome</TableHead>
						<TableHead className={head}>Email</TableHead>
						<TableHead className={`${head} w-40`}>Função</TableHead>
						<TableHead className={`${head} w-32`}>Criado em</TableHead>
						<TableHead className={`${head} w-44 pr-6 text-right`}>
							Ações
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{users.map((user) => {
						const isSelf = user.id === currentUserId
						return (
							<TableRow key={user.id}>
								<TableCell className='py-1.5 pl-6'>
									<div className='flex min-w-0 items-center gap-3'>
										<UserAvatar name={user.name} />
										<span className='truncate text-sm font-bold'>
											{user.name}
										</span>
										{isSelf && <SelfBadge />}
									</div>
								</TableCell>
								<TableCell className='truncate text-sm text-muted-foreground'>
									{user.login}
								</TableCell>
								<TableCell>
									<RoleBadge role={user.role} />
								</TableCell>
								<TableCell className='text-sm text-muted-foreground tabular-nums'>
									{formatCreatedAt(user.createdAt)}
								</TableCell>
								<TableCell className='py-1.5 pr-6'>
									<UserActions user={user} isSelf={isSelf} {...actions} />
								</TableCell>
							</TableRow>
						)
					})}
				</TableBody>
			</Table>
		</div>
	)
}
