import { z } from "zod";

// Espelha as regras do educare-backend para o login.
export const LOGIN_MAX_LENGTH = 254;
// Limite do BCrypt, contado em bytes UTF-8.
export const PASSWORD_MAX_BYTES = 72;

const utf8Length = (value: string) => new TextEncoder().encode(value).length;

export const loginSchema = z.object({
	login: z
		.string()
		.trim()
		.min(1, "Informe o email.")
		.max(LOGIN_MAX_LENGTH, `Use no máximo ${LOGIN_MAX_LENGTH} caracteres.`),
	password: z
		.string()
		.min(1, "Informe a senha.")
		.refine(
			(value) => utf8Length(value) <= PASSWORD_MAX_BYTES,
			"A senha é longa demais.",
		),
});

export type LoginValues = z.infer<typeof loginSchema>;
