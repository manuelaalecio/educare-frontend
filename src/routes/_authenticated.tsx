import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppHeader } from "#/components/layout/app-header";
import { preventCaching } from "#/integrations/educare-api/cache";
import { currentUserQuery } from "#/integrations/educare-api/queries";
import { SESSION_EXPIRED } from "#/integrations/educare-api/session";

// Layout das páginas protegidas: toda rota em `_authenticated/` exige sessão.
export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ context, location }) => {
		preventCaching();
		const session = await context.queryClient.fetchQuery(currentUserQuery);
		if (!session.user) {
			throw redirect({
				to: "/login",
				search: {
					redirect: location.href,
					motivo: session.expired ? SESSION_EXPIRED : undefined,
				},
			});
		}
		return { user: session.user };
	},
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	const { user } = Route.useRouteContext();
	return (
		<>
			<AppHeader user={user} />
			<Outlet />
		</>
	);
}
