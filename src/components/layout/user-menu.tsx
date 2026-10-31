import { Link } from '@tanstack/react-router'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import type { CurrentUser } from '#/integrations/educare-api/auth'
import { useSignOut } from './use-sign-out'
import { initials, roleLabel } from './user'

export function UserMenu({ user }: { user: CurrentUser }) {
	const { signOut, pending } = useSignOut()

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='ghost'
					aria-label={`Menu do usuário: ${user.name}`}
					className='h-11 gap-2.5 rounded-xl border border-transparent px-1.5 data-[state=open]:border-border data-[state=open]:bg-card md:pr-2.5'
				>
					<Avatar className='size-8'>
						<AvatarFallback className='bg-sage-200 text-xs font-extrabold text-sage-700 dark:bg-sage-800 dark:text-sage-300'>
							{initials(user.name)}
						</AvatarFallback>
					</Avatar>
					<span className='hidden flex-col items-start leading-tight md:flex'>
						<span className='text-sm font-bold'>{user.name}</span>
						<span className='text-xs font-medium text-muted-foreground'>
							{roleLabel(user.role)}
						</span>
					</span>
					<ChevronDown
						aria-hidden='true'
						className='hidden size-4 text-muted-foreground md:block'
					/>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align='end'
				// O Radix rotula o menu pelo botão; o nome do menu é só "Menu do usuário".
				aria-labelledby={undefined}
				aria-label='Menu do usuário'
				className='w-62 rounded-xl p-1.5'
			>
				<DropdownMenuLabel className='flex flex-col gap-0.5 px-2.5 pt-2.5 pb-3 font-normal'>
					<span className='text-sm font-bold'>{user.name}</span>
					<span className='text-xs text-muted-foreground'>{user.login}</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					asChild
					className='min-h-11 gap-2.5 px-2.5 font-semibold'
				>
					<Link to='/minha-conta'>
						<UserRound aria-hidden='true' className='size-[18px]' />
						Minha conta
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem
					variant='destructive'
					disabled={pending}
					onSelect={signOut}
					className='min-h-11 gap-2.5 px-2.5 font-semibold'
				>
					<LogOut aria-hidden='true' className='size-[18px]' />
					Sair
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
