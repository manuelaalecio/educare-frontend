import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { preventCaching } from "#/integrations/educare-api/cache";
import { getCurrentUser } from "#/integrations/educare-api/functions";
import { attach, renderRoutes } from "#/testing/render-route";
import { Route as AuthenticatedRoute } from "./_authenticated";
import { Route as HomeRoute } from "./_authenticated/index";
import { Route as ChangePasswordRoute } from "./_authenticated/minha-conta/senha";

vi.mock("#/integrations/educare-api/functions", () => ({
	login: vi.fn(),
	logout: vi.fn(),
	getCurrentUser: vi.fn(),
	changeOwnPassword: vi.fn(),
}));

vi.mock("#/integrations/educare-api/cache", () => ({
	preventCaching: vi.fn(),
}));

vi.mock("@tanstack/react-start", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-start")>()),
	useServerFn: (fn: unknown) => fn,
}));

const sessionMock = vi.mocked(getCurrentUser);

function open(url: string) {
	return renderRoutes(url, (root) => {
		const layout = attach(AuthenticatedRoute, root, { id: "/_authenticated" });
		return [
			layout.addChildren([
				attach(HomeRoute, layout, { id: "/", path: "/" }),
				attach(ChangePasswordRoute, layout, {
					id: "/minha-conta/senha",
					path: "/minha-conta/senha",
				}),
			]),
		];
	});
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("rotas protegidas", () => {
	it("sem sessão, leva ao login com a página pedida, sem o formulário", async () => {
		sessionMock.mockResolvedValue({ user: null, expired: false } as never);
		const { screen, router } = await open("/minha-conta/senha");

		expect(await screen.findByText("Página de login")).toBeDefined();
		expect(router.state.location.pathname).toBe("/login");
		expect(router.state.location.search).toEqual({
			redirect: "/minha-conta/senha",
		});
		expect(screen.queryByLabelText("Senha atual")).toBeNull();
	});

	it("com a sessão expirada, leva ao login com o aviso", async () => {
		sessionMock.mockResolvedValue({ user: null, expired: true } as never);
		const { router } = await open("/");

		expect(router.state.location.pathname).toBe("/login");
		expect(router.state.location.search).toEqual({
			redirect: "/",
			motivo: "sessao-expirada",
		});
	});

	it("com sessão, mostra a página e o usuário no cabeçalho", async () => {
		sessionMock.mockResolvedValue({
			user: {
				id: "1",
				name: "Ana Souza",
				login: "ana.souza@educare.org",
				role: "USER",
			},
			expired: false,
		} as never);
		const { screen } = await open("/");

		expect(await screen.findByText("Bem-vindo(a), Ana Souza")).toBeDefined();
		expect(screen.getByText("Funcionário")).toBeDefined();
		expect(preventCaching).toHaveBeenCalled();
	});
});
