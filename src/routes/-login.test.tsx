import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route } from "./login";

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe("/login", () => {
	it('tem o título "Entrar · Educare"', () => {
		expect(Route.options.head?.({} as never)).toEqual({
			meta: [{ title: "Entrar · Educare" }],
		});
	});

	it("mostra que a entrada ainda não está disponível, sem chamar a API", async () => {
		const fetch = vi.fn();
		vi.stubGlobal("fetch", fetch);
		const LoginPage = Route.options.component as React.ComponentType;
		render(<LoginPage />);

		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "admin@educare.org" },
		});
		fireEvent.change(screen.getByLabelText("Senha"), {
			target: { value: "educare123" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

		expect((await screen.findByRole("alert")).textContent).toBe(
			"A entrada no sistema ainda não está disponível.",
		);
		expect(fetch).not.toHaveBeenCalled();
	});
});
