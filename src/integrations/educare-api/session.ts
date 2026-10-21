import { redirect } from "@tanstack/react-router";
import { ApiError } from "./errors";

export const SESSION_COOKIE = "educare_session";

export const SESSION_EXPIRED = "sessao-expirada";

/** Leitura e escrita do cookie de sessão, injetadas para testar sem o Start. */
export type SessionCookies = {
	get(): string | undefined;
	set(token: string, maxAge: number): void;
	clear(): void;
};

export type CookieOptions = {
	httpOnly: true;
	sameSite: "lax";
	path: "/";
	secure: boolean;
	maxAge?: number;
};

export function sessionCookieOptions(
	isProduction: boolean,
	maxAge?: number,
): CookieOptions {
	return {
		httpOnly: true,
		sameSite: "lax",
		path: "/",
		secure: isProduction,
		...(maxAge === undefined ? {} : { maxAge }),
	};
}

export function sessionExpiredRedirect(currentPath: string) {
	return redirect({
		to: "/login",
		search: { redirect: currentPath, motivo: SESSION_EXPIRED },
	});
}

/**
 * Executa `run` com o token da sessão. Sem cookie, ou se a API recusar o token
 * (`401`), apaga o cookie e manda para o login com o aviso de sessão expirada.
 */
export async function runWithSession<T>(
	cookies: Pick<SessionCookies, "get" | "clear">,
	currentPath: string,
	run: (token: string) => Promise<T>,
): Promise<T> {
	const token = cookies.get();
	if (!token) {
		cookies.clear();
		throw sessionExpiredRedirect(currentPath);
	}
	try {
		return await run(token);
	} catch (error) {
		if (error instanceof ApiError && error.kind === "unauthorized") {
			cookies.clear();
			throw sessionExpiredRedirect(currentPath);
		}
		throw error;
	}
}
