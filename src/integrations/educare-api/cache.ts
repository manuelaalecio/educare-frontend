import { createIsomorphicFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

/**
 * No SSR de uma página protegida, impede que o navegador guarde a resposta:
 * depois do logout, "voltar" recarrega a página em vez de mostrar o cache.
 */
export const preventCaching = createIsomorphicFn()
	.server(() => setResponseHeader("Cache-Control", "no-store"))
	.client(() => {});
