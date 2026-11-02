import { Link } from '@tanstack/react-router'
import { ArrowLeft, Pencil } from 'lucide-react'
import type { ReactNode } from 'react'
import { initials } from '#/components/layout/user'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import type { Child } from '#/integrations/educare-api/children'
import { todayInSaoPaulo } from '#/integrations/educare-api/validation'
import { ChildDocuments } from './child-documents'
import { ClassroomHistory } from './classroom-history'
import { DeleteChildDialog } from './delete-child-dialog'
import {
	ageLabel,
	CEP_MASK,
	formatDate,
	formatMasked,
	genderLabels,
	maritalStatusLabels,
	NOT_INFORMED,
	orNotInformed,
	raceLabels,
} from './format'

/** Tradução de uma lista fixa; um valor desconhecido aparece como veio. */
function translate(labels: Record<string, string>, value: string | undefined) {
	if (!value?.trim()) return NOT_INFORMED
	return labels[value] ?? value
}

type Field = [term: string, value: string]

/** Cabeçalho e cartões dos detalhes de uma criança (design, D10). */
export function ChildDetails({
	child,
	canDelete,
}: {
	child: Child
	canDelete: boolean
}) {
	const personal: Field[] = [
		['Nome completo', child.name],
		['Data de nascimento', formatDate(child.birthDate)],
		['Naturalidade', orNotInformed(child.birthplace)],
		['Nacionalidade', orNotInformed(child.nationality)],
		['Gênero', translate(genderLabels, child.gender)],
		['Raça/cor', translate(raceLabels, child.race)],
		['Estado civil', translate(maritalStatusLabels, child.maritalStatus)],
	]
	const address: Field[] = [
		['CEP', formatMasked(child.cep, CEP_MASK)],
		['Endereço', child.address],
		['Número', child.addressNumber],
		['Complemento', orNotInformed(child.addressComplement)],
		['Bairro', child.neighborhood],
		['Cidade', child.city],
		['UF', child.state],
	]
	const religion: Field[] = [
		['Religião', orNotInformed(child.religion)],
		['Igreja', orNotInformed(child.church)],
	]
	const health: Field[] = [
		['Laudo', orNotInformed(child.healthReport)],
		['Medicação', orNotInformed(child.medication)],
		['Observação médica', orNotInformed(child.medicalObservation)],
	]

	return (
		<main className='flex flex-col gap-6 p-4 md:p-8'>
			<Button asChild variant='ghost' className='h-11 self-start px-2'>
				<Link to='/criancas'>
					<ArrowLeft aria-hidden='true' />
					Voltar para Crianças
				</Link>
			</Button>

			<header className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
				<div className='flex min-w-0 items-center gap-4'>
					<Avatar className='size-14' aria-hidden='true'>
						<AvatarFallback className='bg-sage-200 text-lg font-extrabold text-sage-700 dark:bg-sage-800 dark:text-sage-300'>
							{initials(child.name)}
						</AvatarFallback>
					</Avatar>
					<div className='flex min-w-0 flex-col items-start gap-1'>
						<h1 className='text-2xl font-extrabold tracking-tight break-words text-foreground md:text-3xl'>
							{child.name}
						</h1>
						<p className='text-sm text-muted-foreground'>
							{`${ageLabel(child.birthDate, todayInSaoPaulo())} · ${formatDate(child.birthDate)}`}
						</p>
						<span className='rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground'>
							{child.classroom.name}
						</span>
					</div>
				</div>
				<div className='flex flex-wrap gap-2'>
					<Button asChild className='h-11'>
						<Link
							to='/criancas/$childId/editar'
							params={{ childId: child.id }}
							preload='intent'
						>
							<Pencil aria-hidden='true' />
							Editar
						</Link>
					</Button>
					{canDelete && <DeleteChildDialog child={child} />}
				</div>
			</header>

			<div className='grid gap-6 lg:grid-cols-2'>
				<Section id='dados-pessoais' title='Dados pessoais'>
					<Fields fields={personal} />
				</Section>
				<Section id='documentos' title='Documentos'>
					<ChildDocuments child={child} />
				</Section>
				<Section id='endereco' title='Endereço'>
					<Fields fields={address} />
				</Section>
				<Section id='religiao' title='Religião'>
					<Fields fields={religion} />
				</Section>
				<Section id='saude' title='Saúde'>
					<Fields fields={health} />
				</Section>
				<Section id='historico' title='Histórico de turmas'>
					<ClassroomHistory childId={child.id} />
				</Section>
			</div>
		</main>
	)
}

function Section({
	id,
	title,
	children,
}: {
	id: string
	title: string
	children: ReactNode
}) {
	const titleId = `titulo-${id}`
	return (
		<Card role='region' aria-labelledby={titleId} className='gap-5 px-6'>
			<h2 id={titleId} className='text-base font-bold'>
				{title}
			</h2>
			{children}
		</Card>
	)
}

function Fields({ fields }: { fields: Field[] }) {
	return (
		<dl className='grid gap-4 sm:grid-cols-2'>
			{fields.map(([term, value]) => (
				<div key={term} className='flex min-w-0 flex-col gap-1'>
					<dt className='text-xs font-bold tracking-wide text-muted-foreground uppercase'>
						{term}
					</dt>
					<dd
						className={
							value === NOT_INFORMED
								? 'text-sm text-muted-foreground'
								: 'text-sm font-semibold break-words whitespace-pre-line'
						}
					>
						{value}
					</dd>
				</div>
			))}
		</dl>
	)
}
