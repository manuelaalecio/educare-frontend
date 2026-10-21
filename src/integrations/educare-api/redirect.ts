/**
 * Destino depois do login: só caminhos internos. Qualquer outro valor
 * (URL externa, `//host`, `/\host`, o próprio `/login`) vira `/`.
 */
export function safeRedirect(value: unknown): string {
	if (typeof value !== "string") return "/";
	if (!value.startsWith("/")) return "/";
	if (value.startsWith("//") || value.startsWith("/\\")) return "/";
	const path = value.split(/[?#]/, 1)[0];
	if (path === "/login" || path === "/login/") return "/";
	return value;
}
