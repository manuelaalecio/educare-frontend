import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { CircleAlert, Plus } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button, buttonVariants } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { Pagination } from '#/components/users/pagination'
import {
	type ChildFilters,
	childrenQuery,
	classroomsQuery,
} from '#/integrations/educare-api/queries'
import { todayInSaoPaulo } from '#/integrations/educare-api/validation'
import { ChildCards } from './child-cards'
import { ChildTable } from './child-table'
import { ChildrenFilters } from './children-filters'
import { childCountLabel } from './format'
import { UpdatedAt } from './updated-at'

export type ChildrenSectionProps = {
	filters: ChildFilters
	onSearch: (nome: string | undefined) => void
	onClassroomChange: (turma: string | undefined) => void
	/** `replace` não deixa a página pedida no histórico. */
	onPageChange: (page: number, options?: { replace?: boolean }) => void
}

const newChildClass = 'h-11 rounded-[10px] px-4.5 font-bold'

function NewChildLink() {
	return (
		<Link to='/criancas/nova' className={cn(buttonVariants(), newChildClass)}>
			<Plus aria-hidden='true' className='size-[18px]' />
			Nova criança
		</Link>
	)
}

/** Título da página, subtítulo e "Nova criança", com o conteúdo abaixo. */
function Page({
	subtitle,
	busy,
	children,
}: {
	subtitle?: string
	busy?: boolean
	children: ReactNode
}) {
	return (
		<main className='flex flex-col gap-6 p-4 md:p-8'>
			<div className='flex flex-wrap items-end justify-between gap-3'>
				<div>
					<h1 className='text-2xl font-extrabold tracking-tight text-foreground md:text-3xl'>
						Crianças
					</h1>
					{subtitle && <p className='mt-2 text-muted-foreground'>{subtitle}</p>}
				</div>
				<NewChildLink />
			</div>
			<section
				aria-label='Lista de crianças'
				aria-busy={busy || undefined}
				className='flex flex-col overflow-hidden rounded-xl border bg-card pt-4 text-card-foreground md:pt-6'
			>
				{children}
			</section>
		</main>
	)
}

/** Página `/criancas`: filtros, lista paginada e os estados. */
export function ChildrenSection({
	filters,
	onSearch,
	onClassroomChange,
	onPageChange,
}: ChildrenSectionProps) {
	const queryClient = useQueryClient()
	// O erro do `loader` já está na consulta: mostra a mensagem em vez de
	// buscar de novo ao montar; "Tentar de novo" busca.
	const query = useQuery({ ...childrenQuery(filters), retryOnMount: false })
	const classrooms = useQuery(classroomsQuery)
	const page = filters.pagina
	const filtered = Boolean(filters.nome || filters.turma)
	const data = query.data

	// Uma página além da última leva à última página que existe.
	const lastPage = data?.page.totalPages ?? 0
	const pastTheEnd =
		!query.isPlaceholderData &&
		data !== undefined &&
		data.children.length === 0 &&
		lastPage > 0 &&
		page > lastPage
	useEffect(() => {
		if (pastTheEnd) onPageChange(lastPage, { replace: true })
	}, [pastTheEnd, lastPage, onPageChange])

	// Antecipa a próxima página, para "Próxima" abrir na hora.
	const hasNext = !query.isPlaceholderData && page < lastPage
	useEffect(() => {
		if (hasNext) {
			void queryClient.prefetchQuery(
				childrenQuery({ ...filters, pagina: page + 1 }),
			)
		}
	}, [hasNext, queryClient, filters, page])

	const today = todayInSaoPaulo()

	return (
		<Page
			subtitle={
				data && !query.isError
					? childCountLabel(data.page.totalElements, filtered)
					: undefined
			}
			busy={query.isPending}
		>
			{data && !query.isError && (
				<div className='flex justify-end px-4 pb-2 md:px-6'>
					<UpdatedAt
						updatedAt={query.dataUpdatedAt}
						refreshing={query.isFetching}
						onRefresh={() => void query.refetch()}
					/>
				</div>
			)}
			<ChildrenFilters
				nome={filters.nome}
				turma={filters.turma}
				classrooms={classrooms.data ?? []}
				onSearch={onSearch}
				onClassroomChange={onClassroomChange}
			/>

			{query.isPending && <LoadingRows />}

			{query.isError && (
				<div className='flex flex-col items-start gap-3 border-t p-4 md:p-6'>
					<Alert variant='destructive'>
						<CircleAlert />
						<AlertDescription>{query.error.message}</AlertDescription>
					</Alert>
					<Button
						type='button'
						variant='outline'
						className='h-11'
						disabled={query.isFetching}
						onClick={() => void query.refetch()}
					>
						Tentar de novo
					</Button>
				</div>
			)}

			{data &&
				!query.isError &&
				(data.page.totalElements === 0 ? (
					<Empty filtered={filtered} />
				) : (
					data.children.length > 0 && (
						<>
							<ChildTable items={data.children} today={today} />
							<ChildCards items={data.children} today={today} />
							<Pagination
								page={data.page}
								shown={data.children.length}
								busy={query.isFetching}
								onPrevious={() => onPageChange(page - 1)}
								onNext={() => onPageChange(page + 1)}
							/>
						</>
					)
				))}
		</Page>
	)
}

function Empty({ filtered }: { filtered: boolean }) {
	return (
		<div className='flex flex-col items-center gap-3 border-t px-4 py-10 text-center md:px-6'>
			<p className='font-bold'>
				{filtered ? 'Nenhuma criança encontrada' : 'Nenhuma criança cadastrada'}
			</p>
			{filtered ? (
				<Link
					to='/criancas'
					className={cn(buttonVariants({ variant: 'outline' }), 'h-11')}
				>
					Limpar filtros
				</Link>
			) : (
				<NewChildLink />
			)}
		</div>
	)
}

function LoadingRows() {
	return (
		<div className='flex flex-col border-t'>
			<span className='sr-only'>Carregando crianças…</span>
			{[0, 1, 2].map((row) => (
				<div
					key={row}
					data-testid='child-skeleton'
					className='flex items-center gap-4 border-b px-4 py-5 md:px-6'
				>
					<Skeleton className='h-4 w-40' />
					<Skeleton className='h-4 w-16' />
					<Skeleton className='ml-auto h-4 w-24' />
				</div>
			))}
		</div>
	)
}

/** Primeira carga no navegador, enquanto o `loader` busca a lista. */
export function ChildrenPending() {
	return (
		<Page busy>
			<LoadingRows />
		</Page>
	)
}
