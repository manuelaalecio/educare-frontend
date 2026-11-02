import { CircleAlert } from 'lucide-react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'

export type QueryErrorAlertProps = {
	message: string
	retrying: boolean
	onRetry: () => void
}

/** Erro ao buscar os dados de uma página do formulário, com "Tentar de novo". */
export function QueryErrorAlert({
	message,
	retrying,
	onRetry,
}: QueryErrorAlertProps) {
	return (
		<Alert variant='destructive'>
			<CircleAlert />
			<AlertDescription className='flex flex-col items-start gap-3'>
				{message}
				<Button
					type='button'
					variant='outline'
					className='h-11'
					disabled={retrying}
					onClick={onRetry}
				>
					Tentar de novo
				</Button>
			</AlertDescription>
		</Alert>
	)
}
