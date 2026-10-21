import { createRoute } from "@tanstack/react-router";
import { cleanup, fireEvent, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "#/integrations/educare-api/auth";
import { logout } from "#/integrations/educare-api/functions";
import { renderRoutes } from "#/testing/render-route";
import { AppHeader } from "./app-header";

vi.mock("#/integrations/educare-api/functions", () => ({
	logout: vi.fn(async () => ({ ok: true })),
	getCurrentUser: vi.fn(async () => ({ user: null, expired: false })),
}));

vi.mock("@tanstack/react-start", async (importOriginal) => ({
	...(await importOriginal<typeof import("@tanstack/react-start")>()),
	useServerFn: (fn: unknown) => fn,
}));

function openWith(user: CurrentUser) {
	return renderRoutes("/", (root) => [
		createRoute({
			getParentRoute: () => root,
			path: "/",
			component: () => <AppHeader user={user} />,
		}),
	]);
}

const admin = {
	id: "1",
	name: "Administrador",
	login: "admin@educare.org",
	role: "ADMIN",
};
const ana = {
	id: "2",
	name: "Ana Souza",
	login: "ana.souza@educare.org",
	role: "USER",
};

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("AppHeader", () => {
	it("mostra nome e role de um ADMIN", async () => {
		const { screen } = await openWith(admin);
		const header = within(await screen.findByRole("banner"));
		expect(header.getAllByText("Administrador")).toHaveLength(2);
	});

	it("mostra nome e role de um USER", async () => {
		const { screen } = await openWith(ana);
		const header = within(await screen.findByRole("banner"));
		expect(header.getByText("Ana Souza")).toBeDefined();
		expect(header.getByText("Funcionário")).toBeDefined();
	});

	it("mostra uma role desconhecida como veio", async () => {
		const { screen } = await openWith({ ...ana, role: "SECRETARIA" });
		expect(await screen.findByText("SECRETARIA")).toBeDefined();
	});

	it("tem o link para a troca de senha", async () => {
		const { screen } = await openWith(ana);
		const link = await screen.findByRole("link", { name: "Minha senha" });
		expect(link.getAttribute("href")).toBe("/minha-conta/senha");
	});

	it("ao sair, apaga a sessão, limpa o cache e vai ao login", async () => {
		const { screen, router, queryClient } = await openWith(ana);
		queryClient.setQueryData(["educare-api", "criancas"], [{ nome: "Bia" }]);

		fireEvent.click(await screen.findByRole("button", { name: "Sair" }));

		expect(await screen.findByText("Página de login")).toBeDefined();
		expect(logout).toHaveBeenCalledTimes(1);
		expect(router.state.location.pathname).toBe("/login");
		expect(router.state.location.search).toEqual({});
		expect(
			queryClient.getQueryData(["educare-api", "criancas"]),
		).toBeUndefined();
	});
});
