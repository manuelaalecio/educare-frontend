// Gera os tipos da API do Educare a partir do contrato OpenAPI do backend.
//
// Uso:
//   npm run api:generate
//   API_CONTRACT=../educare-backend/openapi/educare-api.json npm run api:generate
//
// Em qualquer falha, termina com código 1 sem alterar o arquivo de tipos.

import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const DEFAULT_CONTRACT_URL =
	"https://raw.githubusercontent.com/manuelaalecio/educare-backend/main/openapi/educare-api.json";
const DEFAULT_OUTPUT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../src/integrations/educare-api/schema.gen.ts",
);
const HEADER =
	"// Gerado por `npm run api:generate` a partir do contrato do educare-backend.\n// Não edite à mão.\n\n";

async function readContract() {
	const localPath = process.env.API_CONTRACT;
	if (localPath) {
		console.log(`Lendo o contrato de ${localPath}`);
		return readFile(localPath, "utf8");
	}

	// API_CONTRACT_URL existe só para os testes do script.
	const url = process.env.API_CONTRACT_URL ?? DEFAULT_CONTRACT_URL;
	console.log(`Baixando o contrato de ${url}`);
	const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
	if (!response.ok) {
		throw new Error(`download falhou com status ${response.status}`);
	}
	return response.text();
}

function parseContract(text) {
	let contract;
	try {
		contract = JSON.parse(text);
	} catch {
		throw new Error("o contrato não é um JSON válido");
	}
	if (
		typeof contract?.openapi !== "string" ||
		typeof contract.paths !== "object" ||
		contract.paths === null
	) {
		throw new Error(
			"o contrato não é um documento OpenAPI 3 (faltam openapi ou paths)",
		);
	}
	return contract;
}

async function main() {
	// API_TYPES_OUTPUT existe só para os testes do script.
	const output = process.env.API_TYPES_OUTPUT ?? DEFAULT_OUTPUT;
	const contract = parseContract(await readContract());
	const ast = await openapiTS(contract);
	const source = HEADER + astToString(ast);

	const temporary = `${output}.tmp`;
	try {
		await writeFile(temporary, source);
		await rename(temporary, output);
	} catch (error) {
		await rm(temporary, { force: true });
		throw error;
	}
	console.log(`Tipos gerados em ${output}`);
}

main().catch((error) => {
	console.error(`Falha ao gerar os tipos da API: ${error.message}`);
	process.exit(1);
});
