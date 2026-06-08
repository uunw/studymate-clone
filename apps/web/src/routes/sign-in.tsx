import { Alert, Button, Card, CardBody, Field, Input } from '@repo/ui'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { authClient } from '~/lib/auth-client'

export const Route = createFileRoute('/sign-in')({
	beforeLoad: ({ context }) => {
		if (context.user) throw redirect({ to: '/' })
	},
	component: SignIn,
})

const emailSignIn = z.object({
	email: z.email('อีเมลไม่ถูกต้อง'),
	password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
})

function SignIn() {
	const router = useRouter()
	const [error, setError] = useState<string | null>(null)
	const [ssoLoading, setSsoLoading] = useState(false)

	const form = useForm({
		defaultValues: { email: '', password: '' },
		validators: { onSubmit: emailSignIn },
		onSubmit: async ({ value }) => {
			setError(null)
			const res = await authClient.signIn.email({ email: value.email, password: value.password })
			if (res.error) {
				setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
				return
			}
			await router.invalidate()
			router.navigate({ to: '/' })
		},
	})

	async function handleSso() {
		setError(null)
		setSsoLoading(true)
		const res = await authClient.signIn.oauth2({
			providerId: 'kmitl',
			callbackURL: '/',
			errorCallbackURL: '/sign-in',
		})
		if (res?.error) {
			setError('ยังไม่สามารถใช้ KMITL SSO ได้ในขณะนี้')
			setSsoLoading(false)
		}
	}

	return (
		<div className="mx-auto max-w-sm py-10">
			<Card>
				<CardBody className="space-y-5">
					<h1 className="text-center font-bold text-xl">เข้าสู่ระบบ</h1>
					{error && <Alert tone="error">{error}</Alert>}

					<form
						className="space-y-4"
						onSubmit={(e) => {
							e.preventDefault()
							form.handleSubmit()
						}}
					>
						<form.Field name="email">
							{(field) => (
								<Field
									label="อีเมล"
									htmlFor={field.name}
									error={field.state.meta.errors[0]?.message}
								>
									<Input
										id={field.name}
										type="email"
										placeholder="you@kmitl.ac.th"
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

					<div className="flex items-center gap-3 text-slate-400 text-xs">
						<span className="h-px flex-1 bg-slate-200" />
						หรือ
						<span className="h-px flex-1 bg-slate-200" />
					</div>

					<Button variant="secondary" className="w-full" loading={ssoLoading} onClick={handleSso}>
						เข้าสู่ระบบด้วย KMITL SSO
					</Button>

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
