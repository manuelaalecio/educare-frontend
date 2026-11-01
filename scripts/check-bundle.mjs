// Confere que o build do navegador não expõe a URL da API nem o cookie de sessão.
//
// Uso, depois do build:
//   EDUCARE_API_URL=https://api.educare.example npm run build
//   EDUCARE_API_URL=https://api.educare.example node scripts/check-bundle.mjs
//
// Termina com código 1 se `.output/public` contiver o host de EDUCARE_API_URL
// ou a string `educare_session`.

import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PUBLIC_DIR = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../.output/public',
)

async function* files(dir) {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) yield* files(path)
		else yield path
	}
}

async function main() {
	const apiUrl = process.env.EDUCARE_API_URL
	if (!apiUrl)
		throw new Error('defina EDUCARE_API_URL com o valor usado no build')
	const forbidden = [new URL(apiUrl).host, 'educare_session']

	let checked = 0
	const leaks = []
	for await (const path of files(PUBLIC_DIR)) {
		const content = await readFile(path, 'utf8')
		checked++
		for (const text of forbidden) {
			if (content.includes(text))
				leaks.push(`${relative(PUBLIC_DIR, path)}: ${text}`)
		}
	}

	if (checked === 0)
		throw new Error(`nenhum arquivo em ${PUBLIC_DIR}; rode o build antes`)
	if (leaks.length > 0) {
		console.error(
			`O bundle do navegador expõe:\n${leaks.map((l) => `  ${l}`).join('\n')}`,
		)
		process.exit(1)
	}
	console.log(
		`${checked} arquivos em .output/public, sem ${forbidden.join(' nem ')}.`,
	)
}

main().catch((error) => {
	console.error(`check-bundle: ${error.message}`)
	process.exit(1)
})
