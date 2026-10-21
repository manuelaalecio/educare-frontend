import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	type AnyRoute,
	createMemoryHistory,
	createRootRouteWithContext,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";

type Context = { queryClient: QueryClient };

/**
 * Renderiza rotas de verdade num router em memória, com páginas simples em
 * `/`, `/login` e `/minha-conta/senha` para conferir as navegações.
 * `routes` recebem a raiz e devolvem as rotas a testar, já ligadas a ela.
 */
export async function renderRoutes(
	url: string,
	routes: (root: AnyRoute) => AnyRoute[],
) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const root = createRootRouteWithContext<Context>()({
		component: Outlet,
	});
	const tested = routes(root);
	const taken = new Set(tested.flatMap((route) => fullPaths(route)));
	const placeholders = [
		["/", "Página inicial"],
		["/login", "Página de login"],
		["/minha-conta/senha", "Página de troca de senha"],
	]
		.filter(([path]) => !taken.has(path))
		.map(([path, text]) =>
			createRoute({
				getParentRoute: () => root,
				path,
				component: () => <p>{text}</p>,
			}),
		);

	const router = createRouter({
		routeTree: root.addChildren([...tested, ...placeholders]),
		history: createMemoryHistory({ initialEntries: [url] }),
		context: { queryClient },
	});
	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>,
	);
	await router.load();
	return { router, queryClient, screen };
}

/** Caminhos completos de uma rota e das filhas (layouts sem caminho incluídos). */
function fullPaths(route: AnyRoute, parent = ""): string[] {
	const own = (route.options as { path?: string }).path;
	const path = own
		? `${parent.replace(/\/$/, "")}/${own.replace(/^\//, "")}`
		: parent;
	const children = Object.values(
		(route.children ?? {}) as Record<string, AnyRoute>,
	);
	return [
		...(own ? [path] : []),
		...children.flatMap((child) => fullPaths(child, path)),
	];
}

/** Liga uma rota de arquivo (`createFileRoute`) à raiz de teste. */
export function attach<T extends AnyRoute>(
	route: T,
	root: AnyRoute,
	options: { id: string; path?: string },
): AnyRoute {
	return route.update({
		...options,
		getParentRoute: () => root,
	} as never) as AnyRoute;
}
