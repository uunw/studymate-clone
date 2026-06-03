import { signInSchema } from '@repo/core/schemas'
import { Alert, Button, Card, CardBody, Field, Input } from '@repo/ui'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '~/lib/auth-client'

export const Route = createFileRoute('/sign-in')({
	beforeLoad: ({ context }) => {
		if (context.user) throw redirect({ to: '/' })
	},
	component: SignIn,
})

function SignIn() {
	const router = useRouter()
	const [error, setError] = useState<string | null>(null)

	const form = useForm({
		defaultValues: { studentId: '', password: '' },
		validators: { onSubmit: signInSchema },
		onSubmit: async ({ value }) => {
			setError(null)
			const res = await authClient.signIn.username({
				username: value.studentId,
				password: value.password,
			})
			if (res.error) {
				setError('รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง')
				return
			}
			await router.invalidate()
			router.navigate({ to: '/' })
		},
	})

	return (
		<div className="mx-auto max-w-sm py-8">
			<Card>
				<CardBody className="space-y-4">
					<h1 className="font-bold text-xl">เข้าสู่ระบบ</h1>
					{error && <Alert tone="error">{error}</Alert>}
					<form
						className="space-y-4"
						onSubmit={(e) => {
							e.preventDefault()
							form.handleSubmit()
						}}
					>
						<form.Field name="studentId">
							{(field) => (
								<Field
									label="รหัสนักศึกษา"
									htmlFor={field.name}
									error={field.state.meta.errors[0]?.message}
								>
									<Input
										id={field.name}
										inputMode="numeric"
										placeholder="64010001"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								</Field>
							)}
						</form.Field>
						<form.Field name="password">
							{(field) => (
								<Field
									label="รหัสผ่าน"
									htmlFor={field.name}
									error={field.state.meta.errors[0]?.message}
								>
									<Input
										id={field.name}
										type="password"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								</Field>
							)}
						</form.Field>
						<form.Subscribe selector={(s) => s.isSubmitting}>
							{(isSubmitting) => (
								<Button type="submit" className="w-full" loading={isSubmitting}>
									เข้าสู่ระบบ
								</Button>
							)}
						</form.Subscribe>
					</form>
					<p className="text-center text-slate-500 text-sm">
						ยังไม่มีบัญชี?{' '}
						<Link to="/sign-up" className="text-brand-600 hover:underline">
							สมัครสมาชิก
						</Link>
					</p>
				</CardBody>
			</Card>
		</div>
	)
}
