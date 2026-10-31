import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
	ChangePasswordForm,
	type ChangePasswordResult,
} from '#/components/auth/change-password-form'
import { changeOwnPassword } from '#/integrations/educare-api/functions'
import type { ChangePasswordValues } from '#/integrations/educare-api/validation'

export const Route = createFileRoute('/_authenticated/minha-conta/senha')({
	head: () => ({ meta: [{ title: 'Minha senha · Educare' }] }),
	component: ChangePasswordPage,
})

function ChangePasswordPage() {
	const changeFn = useServerFn(changeOwnPassword)

	async function submit(
		values: ChangePasswordValues,
	): Promise<ChangePasswordResult> {
		const result = await changeFn({ data: values })
		return result.ok
			? result
			: { ok: false, message: result.message, fieldErrors: result.fieldErrors }
	}

	return (
		<main className='flex justify-center p-4 pt-12'>
			<ChangePasswordForm onSubmit={submit} />
		</main>
	)
}
