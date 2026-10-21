import { createFileRoute } from "@tanstack/react-router";
import { LoginForm, type LoginResult } from "#/components/auth/login-form";

export const Route = createFileRoute("/login")({
	head: () => ({ meta: [{ title: "Entrar · Educare" }] }),
	component: LoginPage,
});

// Provisória: a add-backend-integration troca pela server function `login`.
async function unavailableLogin(): Promise<LoginResult> {
	return { message: "A entrada no sistema ainda não está disponível." };
}

function LoginPage() {
	return (
		<main className="flex min-h-svh items-center justify-center p-4">
			<LoginForm onSubmit={unavailableLogin} />
		</main>
	);
}
