import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY } from "./theme-script";
import { ThemeToggle } from "./theme-toggle";

type Listener = (event: { matches: boolean }) => void;

function mockSystem(initialDark: boolean) {
	const listeners = new Set<Listener>();
	const media = {
		matches: initialDark,
		addEventListener: (_: string, listener: Listener) =>
			listeners.add(listener),
		removeEventListener: (_: string, listener: Listener) =>
			listeners.delete(listener),
	};
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => media),
	);
	return {
		setDark(dark: boolean) {
			media.matches = dark;
			act(() => {
				for (const listener of listeners) listener({ matches: dark });
			});
		},
	};
}

const root = document.documentElement;

beforeEach(() => {
	localStorage.clear();
	root.className = "";
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("ThemeToggle", () => {
	it("abre no escuro na primeira visita com o sistema escuro", () => {
		mockSystem(true);
		render(<ThemeToggle />);
		expect(root.classList.contains("dark")).toBe(true);
		expect(
			screen.getByRole("button", { name: "Usar tema claro" }),
		).toBeDefined();
	});

	it("alterna o tema e salva a escolha", () => {
		mockSystem(true);
		render(<ThemeToggle />);

		fireEvent.click(screen.getByRole("button", { name: "Usar tema claro" }));
		expect(root.classList.contains("dark")).toBe(false);
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("claro");
		expect(
			screen.getByRole("button", { name: "Usar tema escuro" }),
		).toBeDefined();

		fireEvent.click(screen.getByRole("button", { name: "Usar tema escuro" }));
		expect(root.classList.contains("dark")).toBe(true);
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("escuro");
	});

	it("mantém a escolha salva com o sistema escuro", () => {
		localStorage.setItem(THEME_STORAGE_KEY, "claro");
		mockSystem(true);
		render(<ThemeToggle />);
		expect(root.classList.contains("dark")).toBe(false);
		expect(
			screen.getByRole("button", { name: "Usar tema escuro" }),
		).toBeDefined();
	});

	it("acompanha a mudança do sistema sem escolha salva", () => {
		const system = mockSystem(false);
		render(<ThemeToggle />);
		expect(root.classList.contains("dark")).toBe(false);

		system.setDark(true);
		expect(root.classList.contains("dark")).toBe(true);
		expect(
			screen.getByRole("button", { name: "Usar tema claro" }),
		).toBeDefined();
	});

	it("ignora a mudança do sistema depois de uma escolha", () => {
		const system = mockSystem(false);
		render(<ThemeToggle />);
		fireEvent.click(screen.getByRole("button", { name: "Usar tema escuro" }));

		system.setDark(false);
		expect(root.classList.contains("dark")).toBe(true);
	});

	it("muda o tema sem erro com o armazenamento bloqueado", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("SecurityError");
		});
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("SecurityError");
		});
		mockSystem(false);
		render(<ThemeToggle />);

		fireEvent.click(screen.getByRole("button", { name: "Usar tema escuro" }));
		expect(root.classList.contains("dark")).toBe(true);
		expect(
			screen.getByRole("button", { name: "Usar tema claro" }),
		).toBeDefined();
	});
});
