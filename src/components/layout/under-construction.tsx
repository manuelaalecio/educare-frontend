/** Página provisória de uma área que ainda não foi construída. */
export function UnderConstruction({ title }: { title: string }) {
	return (
		<main className='p-4 md:p-8'>
			<h1 className='text-2xl font-extrabold tracking-tight text-foreground md:text-3xl'>
				{title}
			</h1>
			<p className='mt-2 text-muted-foreground'>
				Esta página ainda está em construção.
			</p>
		</main>
	)
}
