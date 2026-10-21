import { isRedirect } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "./errors";
import { runWithSession } from "./session";

function cookies(token?: string) {
	return { get: vi.fn(() => token), clear: vi.fn() };
}

async function caught(promise: Promise<unknown>) {
	return promise.then(
		() => {
			throw new Error("deveria ter lançado");
		},
		(error: unknown) => error,
	);
}

function expectSessionExpired(error: unknown, path: string) {
	expect(isRedirect(error)).toBe(true);
	expect((error as { options: unknown }).options).toMatchObject({
		to: "/login",
		search: { redirect: path, motivo: "sessao-expirada" },
	});
}

describe("runWithSession", () => {
	it("passa o token do cookie para a chamada", async () => {
		const run = vi.fn(async (token: string) => `ok:${token}`);
		await expect(
			runWithSession(cookies("token-da-sessao"), "/", run),
		).resolves.toBe("ok:token-da-sessao");
	});

	it("sem cookie, manda para o login sem chamar a API", async () => {
		const jar = cookies();
		const run = vi.fn();
		const error = await caught(runWithSession(jar, "/minha-conta/senha", run));

		expectSessionExpired(error, "/minha-conta/senha");
		expect(run).not.toHaveBeenCalled();
		expect(jar.clear).toHaveBeenCalled();
	});

	it("com token expirado (401), apaga o cookie e manda para o login", async () => {
		const jar = cookies("token-expirado");
		const error = await caught(
			runWithSession(jar, "/criancas?pagina=2", async () => {
				throw new ApiError("unauthorized", { status: 401 });
			}),
		);

		expectSessionExpired(error, "/criancas?pagina=2");
		expect(jar.clear).toHaveBeenCalled();
	});

	it("com usuário excluído (401), apaga o cookie e manda para o login", async () => {
		const jar = cookies("token-de-usuaria-excluida");
		const error = await caught(
			runWithSession(jar, "/", async () => {
				throw new ApiError("unauthorized", { status: 401 });
			}),
		);

		expectSessionExpired(error, "/");
		expect(jar.clear).toHaveBeenCalled();
	});

	it("repassa outros erros sem apagar o cookie", async () => {
		const jar = cookies("token-da-sessao");
		const error = await caught(
			runWithSession(jar, "/", async () => {
				throw new ApiError("forbidden", { status: 403 });
			}),
		);

		expect(error).toBeInstanceOf(ApiError);
		expect(jar.clear).not.toHaveBeenCalled();
	});
});
