import { createMiddleware } from "@tanstack/react-start";
import { requestCookies, requestPath } from "./request";
import { runWithSession } from "./session";

/**
 * Middleware das server functions autenticadas: injeta `context.token` e, sem
 * sessão válida, apaga o cookie e manda para o login.
 */
export const authenticated = createMiddleware({ type: "function" })
	.client(({ next }) =>
		// No navegador, a requisição é a da server function; o caminho da página
		// vai junto. No SSR, `window` não existe e vale a URL da requisição.
		next({
			sendContext: {
				path:
					typeof window === "undefined"
						? undefined
						: window.location.pathname + window.location.search,
			},
		}),
	)
	.server(({ next, context }) => {
		const path =
			typeof context.path === "string" && context.path.startsWith("/")
				? context.path
				: requestPath();
		return runWithSession(requestCookies, path, (token) =>
			next({ context: { token } }),
		);
	});
