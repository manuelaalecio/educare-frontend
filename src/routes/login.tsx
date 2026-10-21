import { useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	redirect,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LoginForm, type LoginResult } from "#/components/auth/login-form";
import { login } from "#/integrations/educare-api/functions";
import { messages } from "#/integrations/educare-api/messages";
import { currentUserQuery } from "#/integrations/educare-api/queries";
import { safeRedirect } from "#/integrations/educare-api/redirect";
import { SESSION_EXPIRED } from "#/integrations/educare-api/session";
import type { LoginValues } from "#/integrations/educare-api/validation";

const searchSchema = z.object({
	redirect: z.string().optional().catch(undefined),
	motivo: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/login")({
	validateSearch: searchSchema,
	head: () => ({ meta: [{ title: "Entrar · Educare" }] }),
	beforeLoad: async ({ context }) => {
		const session = await context.queryClient.fetchQuery(currentUserQuery);
		if (session.user) throw redirect({ to: "/" });
	},
	component: LoginPage,
});

function LoginPage() {
	const search = Route.useSearch();
	const router = useRouter();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const loginFn = useServerFn(login);

	async function submit(values: LoginValues): Promise<LoginResult> {
		const result = await loginFn({ data: values });
		if (result.ok) {
			queryClient.removeQueries({ queryKey: currentUserQuery.queryKey });
			await router.invalidate();
			await navigate({ href: safeRedirect(search.redirect) });
			return;
		}
		return {
			message: result.message,
			fieldErrors: result.fieldErrors,
			clearPassword: result.kind === "invalid-credentials",
		};
	}

	return (
		<main className="flex min-h-svh items-center justify-center p-4">
			<LoginForm
				onSubmit={submit}
				notice={
					search.motivo === SESSION_EXPIRED
						? messages.sessionExpired
						: undefined
				}
			/>
		</main>
	);
}
