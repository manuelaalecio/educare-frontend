import { useState } from 'react'
import { Button } from '#/components/ui/button'
import type { Child } from '#/integrations/educare-api/children'
import {
	formatBirthCertificate,
	formatCpf,
	maskBirthCertificate,
	maskCpf,
	maskRg,
	NOT_INFORMED,
} from './format'

type DocumentKey = 'cpf' | 'rg' | 'certificate'

type DocumentRow = {
	key: DocumentKey
	term: string
	/** Nome do documento no botão: "Mostrar CPF". */
	name: string
	value: string | undefined
	mask: (value: string) => string
	format: (value: string) => string
}

/**
 * Lista do cartão "Documentos": CPF, RG e matrícula mascarados, cada um com
 * "Mostrar"/"Ocultar". O estado é local: nada é buscado de novo, e os
 * documentos voltam mascarados quando a página sai da tela (design, D10).
 */
export function ChildDocuments({ child }: { child: Child }) {
	const [revealed, setRevealed] = useState<Record<DocumentKey, boolean>>({
		cpf: false,
		rg: false,
		certificate: false,
	})

	const rows: DocumentRow[] = [
		{
			key: 'cpf',
			term: 'CPF',
			name: 'CPF',
			value: child.cpf,
			mask: maskCpf,
			format: formatCpf,
		},
		{
			key: 'rg',
			term: 'RG',
			name: 'RG',
			value: child.rg,
			mask: maskRg,
			format: (rg) => rg,
		},
		{
			key: 'certificate',
			term: 'Matrícula da certidão',
			name: 'matrícula',
			value: child.birthCertificateNumber,
			mask: maskBirthCertificate,
			format: formatBirthCertificate,
		},
	]

	return (
		<dl className='grid gap-4'>
			{rows.map((row) => {
				const value = row.value?.trim()
				const shown = revealed[row.key]
				return (
					<div key={row.key} className='flex min-w-0 flex-col gap-1'>
						<dt className='text-xs font-bold tracking-wide text-muted-foreground uppercase'>
							{row.term}
						</dt>
						<dd className='flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1'>
							{value ? (
								<>
									<span className='font-mono text-sm font-semibold break-all'>
										{shown ? row.format(value) : row.mask(value)}
									</span>
									<Button
										type='button'
										variant='link'
										className='h-11 px-0'
										aria-label={`${shown ? 'Ocultar' : 'Mostrar'} ${row.name}`}
										onClick={() =>
											setRevealed((current) => ({
												...current,
												[row.key]: !current[row.key],
											}))
										}
									>
										{shown ? 'Ocultar' : 'Mostrar'}
									</Button>
								</>
							) : (
								<span className='text-sm text-muted-foreground'>
									{NOT_INFORMED}
								</span>
							)}
						</dd>
					</div>
				)
			})}
		</dl>
	)
}
