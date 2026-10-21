import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

afterEach(() => {
	cleanup();
});

function fill(label: string, value: string) {
	fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function submit() {
	fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

// Texto do erro ligado ao campo por aria-describedby.
function errorOf(label: string) {
	const id = screen.getByLabelText(label).getAttribute("aria-describedby");
	return id ? document.getElementById(id)?.textContent : undefined;
}

describe("LoginForm", () => {
	it("mostra os campos e o botão, sem link de cadastro", () => {
		render(<LoginForm onSubmit={vi.fn()} />);
		expect(screen.getByLabelText("Email").getAttribute("type")).toBe("email");
		expect(screen.getByLabelText("Senha").getAttribute("type")).toBe(
			"password",
		);
		expect(screen.getByRole("button", { name: "Entrar" })).toBeDefined();
		expect(screen.queryByRole("link")).toBeNull();
	});

	it("mostra erro nos dois campos vazios sem chamar a ação", async () => {
		const onSubmit = vi.fn();
		render(<LoginForm onSubmit={onSubmit} />);
		submit();

		await waitFor(() => expect(errorOf("Email")).toBe("Informe o email."));
		expect(errorOf("Senha")).toBe("Informe a senha.");
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("mostra erro com o email só com espaços sem chamar a ação", async () => {
		const onSubmit = vi.fn();
		render(<LoginForm onSubmit={onSubmit} />);
		fill("Email", "   ");
		submit();

		await waitFor(() => expect(errorOf("Email")).toBe("Informe o email."));
		expect(errorOf("Senha")).toBe("Informe a senha.");
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("mostra erro com o email de 255 caracteres sem chamar a ação", async () => {
		const onSubmit = vi.fn();
		render(<LoginForm onSubmit={onSubmit} />);
		fill("Email", `${"a".repeat(243)}@educare.org`);
		fill("Senha", "educare123");
		submit();

		await waitFor(() => expect(errorOf("Email")).toBeTruthy());
		expect(errorOf("Senha")).toBeUndefined();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("mostra erro com a senha acima de 72 bytes sem chamar a ação", async () => {
		const onSubmit = vi.fn();
		render(<LoginForm onSubmit={onSubmit} />);
		fill("Email", "admin@educare.org");
		fill("Senha", "ç".repeat(40));
		submit();

		await waitFor(() => expect(errorOf("Senha")).toBeTruthy());
		expect(errorOf("Email")).toBeUndefined();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("desabilita o botão durante o envio e chama a ação uma só vez", async () => {
		let finish: (value: undefined) => void = () => {};
		const onSubmit = vi.fn(
			() =>
				new Promise<undefined>((resolve) => {
					finish = resolve;
				}),
		);
		render(<LoginForm onSubmit={onSubmit} />);
		fill("Email", " admin@educare.org ");
		fill("Senha", "educare123");
		submit();

		const button = screen.getByRole("button", { name: "Entrar" });
		await waitFor(() => expect(button.hasAttribute("disabled")).toBe(true));
		submit();
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit).toHaveBeenCalledWith({
			login: "admin@educare.org",
			password: "educare123",
		});

		finish(undefined);
		await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
	});

	it("mostra no alerta a mensagem devolvida pela ação", async () => {
		render(
			<LoginForm
				onSubmit={vi.fn(async () => ({ message: "Email ou senha inválidos." }))}
			/>,
		);
		fill("Email", "admin@educare.org");
		fill("Senha", "educare123");
		submit();

		expect((await screen.findByRole("alert")).textContent).toBe(
			"Email ou senha inválidos.",
		);
	});
});
