import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	readStoredTheme,
	resolveTheme,
	THEME_STORAGE_KEY,
	themeScript,
} from "./theme-script";

function mockSystemDark(dark: boolean) {
	vi.stubGlobal(
		"matchMedia",
		vi.fn((query: string) => ({
			matches: dark,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
}

function runThemeScript() {
	new Function(themeScript)();
}

const root = document.documentElement;

beforeEach(() => {
	localStorage.clear();
	root.className = "";
	root.style.colorScheme = "";
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("resolveTheme", () => {
	it("usa a escolha salva sobre o sistema", () => {
		expect(resolveTheme("escuro", false)).toBe("escuro");
		expect(resolveTheme("claro", true)).toBe("claro");
	});

	it("segue o sistema sem escolha salva", () => {
		expect(resolveTheme(null, true)).toBe("escuro");
		expect(resolveTheme(null, false)).toBe("claro");
	});

	it("segue o sistema com um valor inválido", () => {
		expect(resolveTheme("dark", true)).toBe("escuro");
		expect(resolveTheme("dark", false)).toBe("claro");
	});
});

describe("readStoredTheme", () => {
	it("devolve null com um valor inválido", () => {
		localStorage.setItem(THEME_STORAGE_KEY, "roxo");
		expect(readStoredTheme()).toBeNull();
	});

	it("devolve null, sem exceção, quando o armazenamento lança erro", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("SecurityError");
		});
		expect(readStoredTheme()).toBeNull();
	});
});

describe("themeScript", () => {
	it('aplica o escuro com "escuro" salvo e o sistema claro', () => {
		localStorage.setItem(THEME_STORAGE_KEY, "escuro");
		mockSystemDark(false);
		runThemeScript();
		expect(root.classList.contains("dark")).toBe(true);
		expect(root.style.colorScheme).toBe("dark");
	});

	it("aplica o escuro sem nada salvo e com o sistema escuro", () => {
		mockSystemDark(true);
		runThemeScript();
		expect(root.classList.contains("dark")).toBe(true);
	});

	it("segue o sistema com um valor inválido", () => {
		localStorage.setItem(THEME_STORAGE_KEY, "roxo");
		mockSystemDark(false);
		runThemeScript();
		expect(root.classList.contains("dark")).toBe(false);
		expect(root.style.colorScheme).toBe("light");
	});

	it("segue o sistema, sem exceção, quando o armazenamento lança erro", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("SecurityError");
		});
		mockSystemDark(true);
		expect(runThemeScript).not.toThrow();
		expect(root.classList.contains("dark")).toBe(true);
	});
});
