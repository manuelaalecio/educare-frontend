import { useForm } from "@tanstack/react-form";
import { CircleAlert } from "lucide-react";
import { useId, useState } from "react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	type LoginValues,
	loginSchema,
} from "#/integrations/educare-api/validation";

export type LoginResult = { message?: string } | undefined;

export type LoginFormProps = {
	onSubmit: (values: LoginValues) => Promise<LoginResult>;
};

export function LoginForm({ onSubmit }: LoginFormProps) {
	const [message, setMessage] = useState<string>();
	const id = useId();

	const form = useForm({
		defaultValues: { login: "", password: "" },
		validators: { onSubmit: loginSchema },
		onSubmit: async ({ value }) => {
			setMessage(undefined);
			const result = await onSubmit(loginSchema.parse(value));
			setMessage(result?.message);
		},
	});

	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle className="text-2xl">Educare</CardTitle>
				<CardDescription>Entre com seu email e senha.</CardDescription>
			</CardHeader>
			<CardContent>
				{/* noValidate: a validação é a do loginSchema, não a do navegador. */}
				<form
					noValidate
					className="flex flex-col gap-4"
					onSubmit={(event) => {
						event.preventDefault();
						form.handleSubmit();
					}}
				>
					{message && (
						<Alert variant="destructive">
							<CircleAlert />
							<AlertDescription>{message}</AlertDescription>
						</Alert>
					)}

					<form.Field name="login">
						{(field) => {
							const error = field.state.meta.errors[0]?.message;
							const errorId = `${id}-login-error`;
							return (
								<div className="flex flex-col gap-2">
									<Label htmlFor={`${id}-login`}>Email</Label>
									<Input
										id={`${id}-login`}
										name={field.name}
										type="email"
										autoComplete="username"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={error ? true : undefined}
										aria-describedby={error ? errorId : undefined}
									/>
									{error && (
										<p id={errorId} className="text-sm text-destructive">
											{error}
										</p>
									)}
								</div>
							);
						}}
					</form.Field>

					<form.Field name="password">
						{(field) => {
							const error = field.state.meta.errors[0]?.message;
							const errorId = `${id}-password-error`;
							return (
								<div className="flex flex-col gap-2">
									<Label htmlFor={`${id}-password`}>Senha</Label>
									<Input
										id={`${id}-password`}
										name={field.name}
										type="password"
										autoComplete="current-password"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={error ? true : undefined}
										aria-describedby={error ? errorId : undefined}
									/>
									{error && (
										<p id={errorId} className="text-sm text-destructive">
											{error}
										</p>
									)}
								</div>
							);
						}}
					</form.Field>

					<form.Subscribe selector={(state) => state.isSubmitting}>
						{(isSubmitting) => (
							<Button type="submit" disabled={isSubmitting}>
								Entrar
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	);
}
