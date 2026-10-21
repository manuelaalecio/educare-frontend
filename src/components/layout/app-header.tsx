import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "#/components/ui/button";
import type { CurrentUser } from "#/integrations/educare-api/auth";
import { logout } from "#/integrations/educare-api/functions";

const roleLabels: Record<string, string> = {
	ADMIN: "Administrador",
	USER: "Funcionário",
};

/** O contrato não fixa as roles: uma desconhecida aparece como veio. */
export function roleLabel(role: string) {
	return roleLabels[role] ?? role;
}

export function AppHeader({ user }: { user: CurrentUser }) {
	const queryClient = useQueryClient();
	const router = useRouter();
	const navigate = useNavigate();
	const logoutFn = useServerFn(logout);

	async function signOut() {
		await logoutFn();
		queryClient.clear();
		// Vai ao login antes de invalidar, para não voltar com `?redirect=`.
		await navigate({ to: "/login" });
		await router.invalidate();
	}

	return (
		// pr-16 deixa espaço para o botão de tema, fixo no canto.
		<header className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-3 pr-16">
			<Link to="/" className="text-lg font-semibold text-foreground">
				Educare
			</Link>
			<div className="flex flex-wrap items-center gap-4">
				<div className="flex flex-col text-right text-sm leading-tight">
					<span className="font-medium text-foreground">{user.name}</span>
					<span className="text-muted-foreground">{roleLabel(user.role)}</span>
				</div>
				<Button variant="ghost" size="sm" asChild>
					<Link to="/minha-conta/senha">Minha senha</Link>
				</Button>
				<Button variant="outline" size="sm" onClick={signOut}>
					Sair
				</Button>
			</div>
		</header>
	);
}
