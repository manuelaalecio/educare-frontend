import { useEffect, useState } from 'react'

/** `value`, só depois de `delay` ms sem mudar. */
export function useDebouncedValue<T>(value: T, delay: number) {
	const [debounced, setDebounced] = useState(value)
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay)
		return () => clearTimeout(timer)
	}, [value, delay])
	return debounced
}
