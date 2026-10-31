import { cn } from 'cn'
import { Eye, EyeOff } from 'lucide-react'
import { type ComponentProps, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'

export type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'> & {
	/** Rótulo do campo, usado no nome do botão ("Mostrar senha atual"). */
	label: string
}

/** Campo de senha com o botão de mostrar e ocultar o que foi digitado. */
export function PasswordInput({
	label,
	className,
	...props
}: PasswordInputProps) {
	const [visible, setVisible] = useState(false)
	const name = label.toLocaleLowerCase('pt-BR')

	return (
		<div className='relative'>
			<Input
				{...props}
				type={visible ? 'text' : 'password'}
				className={cn('h-11 pr-11', className)}
			/>
			<Button
				type='button'
				variant='ghost'
				size='icon'
				aria-label={visible ? `Ocultar ${name}` : `Mostrar ${name}`}
				title={visible ? 'Ocultar senha' : 'Mostrar senha'}
				onClick={() => setVisible((value) => !value)}
				className='absolute top-1 right-1 text-muted-foreground'
			>
				{visible ? (
					<EyeOff aria-hidden='true' className='size-[18px]' />
				) : (
					<Eye aria-hidden='true' className='size-[18px]' />
				)}
			</Button>
		</div>
	)
}
