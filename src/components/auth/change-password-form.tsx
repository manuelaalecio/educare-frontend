import { useForm } from "@tanstack/react-form";
import { CircleAlert } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { messages } from "#/integrations/educare-api/messages";
import {
	type ChangePasswordValues,
	changePasswordSchema,
} from "#/integrations/educare-api/validation";

type FieldName = keyof ChangePasswordValues;
type FieldErrors = Partial<Record<FieldName, string>>;

export type ChangePasswordResult =
	| { ok: true }
	| { ok: false; message?: string; fieldErrors?: FieldErrors };

export type ChangePasswordFormProps = {
	onSubmit: (values: ChangePasswordValues) => Promise<ChangePasswordResult>;
};

const labels: Record<FieldName, string> = {
	currentPassword: "Senha atual",
	newPassword: "Nova senha",
	confirmPassword: "Confirme a nova senha",
};

const autoComplete: Record<FieldName, string> = {
	currentPassword: "current-password",
	newPassword: "new-password",
	confirmPassword: "new-password",
};

type FieldError = string | { message?: string } | undefined;

function firstError(errors: FieldError[]) {
	const [error] = errors;
	return typeof error === "string" ? error : error?.message;
}

const emptyValues: ChangePasswordValues = {
	currentPassword: "",
	newPassword: "",
	confirmPassword: "",
};

export function ChangePasswordForm({ onSubmit }: ChangePasswordFormProps) {
	const [message, setMessage] = useState<string>();
	const [serverErrors, setServerErrors] = useState<FieldErrors>({});
	const id = useId();

	const form = useForm({
		defaultValues: emptyValues,
		validators: { onSubmit: changePasswordSchema },
		onSubmit: async ({ value }) => {
			setMessage(undefined);
			setServerErrors({});
			const result = await onSubmit(value);
			if (result.ok) {
				form.reset();
				toast.success(messages.passwordChanged);
				return;
			}
			setMessage(result.message);
			setServerErrors(result.fieldErrors ?? {});
		},
	});

	return (
		<Card className="w-full max-w-sm">
			<CardHeader>
				<CardTitle className="text-2xl">Minha senha</CardTitle>
			</CardHeader>
			<CardContent>
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

					{(Object.keys(labels) as FieldName[]).map((name) => (
						<form.Field key={name} name={name}>
							{(field) => {
								const error =
									firstError(field.state.meta.errors) ?? serverErrors[name];
								const inputId = `${id}-${name}`;
								const errorId = `${inputId}-error`;
								return (
									<div className="flex flex-col gap-2">
										<Label htmlFor={inputId}>{labels[name]}</Label>
										<Input
											id={inputId}
											name={name}
											type="password"
											autoComplete={autoComplete[name]}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => {
												field.handleChange(event.target.value);
												setServerErrors((errors) => ({
													...errors,
													[name]: undefined,
												}));
											}}
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
					))}

					<form.Subscribe selector={(state) => state.isSubmitting}>
						{(isSubmitting) => (
							<Button type="submit" disabled={isSubmitting}>
								Trocar senha
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	);
}
