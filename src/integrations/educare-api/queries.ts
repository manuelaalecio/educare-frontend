import { queryOptions } from "@tanstack/react-query";
import { getCurrentUser } from "./functions";

// Navegações internas reaproveitam a sessão por 5 minutos; um carregamento
// completo (SSR) sempre chama `/auth/me`.
export const currentUserQuery = queryOptions({
	queryKey: ["educare-api", "session"],
	queryFn: () => getCurrentUser(),
	staleTime: 5 * 60_000,
});
