import { Search } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#/components/ui/select'
import { useDebouncedValue } from './use-debounced-value'

// O Select do Radix não aceita `''` como valor de item.
const ALL = 'all'

type Props = {
	nome: string | undefined
	turma: string | undefined
	classrooms: { id: string; name: string }[]
	/** Chamado 300 ms depois da última tecla. */
	onSearch: (nome: string | undefined) => void
	onClassroomChange: (turma: string | undefined) => void
}

/** Busca por nome (com debounce) e seletor de turma. */
export function ChildrenFilters({
	nome,
	turma,
	classrooms,
	onSearch,
	onClassroomChange,
}: Props) {
	const id = useId()
	const [text, setText] = useState(nome ?? '')

	// A URL mudou por fora ("Limpar filtros", voltar): o campo acompanha.
	const [previousNome, setPreviousNome] = useState(nome)
	if (nome !== previousNome) {
		setPreviousNome(nome)
		if (text.trim() !== (nome ?? '')) setText(nome ?? '')
	}

	// Só o valor parado há 300 ms vai para a URL. `nome` e `onSearch` ficam
	// numa ref: a busca só dispara quando o texto digitado muda.
	const debounced = useDebouncedValue(text, 300)
	const latest = useRef({ nome, onSearch })
	latest.current = { nome, onSearch }
	useEffect(() => {
		const next = debounced.trim() || undefined
		if (next !== latest.current.nome) latest.current.onSearch(next)
	}, [debounced])

	const sorted = [...classrooms].sort((a, b) =>
		a.name.localeCompare(b.name, 'pt-BR'),
	)

	return (
		<div className='flex flex-col gap-3 px-4 pb-4 md:flex-row md:items-end md:px-6'>
			<div className='flex flex-1 flex-col gap-2'>
				<Label htmlFor={`${id}-nome`} className='sr-only'>
					Buscar por nome
				</Label>
				<div className='relative'>
					<Search
						aria-hidden='true'
						className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground'
					/>
					<Input
						id={`${id}-nome`}
						type='search'
						placeholder='Buscar por nome'
						autoComplete='off'
						maxLength={150}
						className='h-11 pl-9'
						value={text}
						onChange={(event) => setText(event.target.value)}
					/>
				</div>
			</div>
			<div className='flex flex-col gap-2 md:w-64'>
				<Label htmlFor={`${id}-turma`}>Turma</Label>
				<Select
					value={turma ?? ALL}
					onValueChange={(value) =>
						onClassroomChange(value === ALL ? undefined : value)
					}
				>
					<SelectTrigger id={`${id}-turma`} className='h-11 w-full'>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL}>Todas as turmas</SelectItem>
						{sorted.map((classroom) => (
							<SelectItem key={classroom.id} value={classroom.id}>
								{classroom.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}
