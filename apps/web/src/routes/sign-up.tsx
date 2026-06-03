import { KMITL_EMAIL_DOMAIN } from '@repo/core'
import { otpVerifySchema, signUpSchema } from '@repo/core/schemas'
import { Alert, Button, Card, CardBody, Field, Input } from '@repo/ui'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '~/lib/auth-client'

export const Route = createFileRoute('/sign-up')({
	beforeLoad: ({ context }) => {
		if (context.user) throw redirect({ to: '/' })
	},
	component: SignUp,
})

const emailFor = (studentId: string) => `${studentId}@${KMITL_EMAIL_DOMAIN}`

function SignUp() {
	const router = useRouter()
	const [error, setError] = useState<string | null>(null)
	const [pendingEmail, setPendingEmail] = useState<string | null>(null)

	const signUpForm = useForm({
		defaultValues: {
			studentId: '',
			firstName: '',
			lastName: '',
			nickname: '',
			password: '',
			passwordConfirm: '',
		},
		validators: { onSubmit: signUpSchema },
		onSubmit: async ({ value }) => {
			setError(null)
			const email = emailFor(value.studentId)
			const res = await authClient.signUp.email({
				email,
				username: value.studentId,
				password: value.password,
				name: `${value.firstName} ${value.lastName}`,
				firstName: value.firstName,
				lastName: value.lastName,
				nickname: value.nickname,
			})
			if (res.error) {
				setError((res.error as { message?: string }).message ?? 'สมัครสมาชิกไม่สำเร็จ')
				return
			}
			// emailOTP plugin auto-sends a verification code on sign-up.
			setPendingEmail(email)
		},
	})

	const otpForm = useForm({
		defaultValues: { otp: '' },
		validators: { onSubmit: otpVerifySchema.pick({ otp: true }) },
		onSubmit: async ({ value }) => {
			if (!pendingEmail) return
			setError(null)
			const res = await authClient.emailOtp.verifyEmail({ email: pendingEmail, otp: value.otp })
			if (res.error) {
				setError('รหัส OTP ไม่ถูกต้องหรือหมดอายุ')
				return
			}
			await router.invalidate()
			router.navigate({ to: '/' })
		},
	})

	return (
		<div className="mx-auto max-w-md py-8">
			<Card>
				<CardBody className="space-y-4">
					<h1 className="font-bold text-xl">สมัครสมาชิก</h1>
					{error && <Alert tone="error">{error}</Alert>}

					{!pendingEmail ? (
						<form
							className="space-y-4"
							onSubmit={(e) => {
								e.preventDefault()
								signUpForm.handleSubmit()
							}}
						>
							<signUpForm.Field name="studentId">
								{(field) => (
									<Field
										label="รหัสนักศึกษา"
										htmlFor={field.name}
										error={field.state.meta.errors[0]?.message}
									>
										<Input
											id={field.name}
											placeholder="64010001"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
									</Field>
								)}
							</signUpForm.Field>
							<div className="grid grid-cols-2 gap-3">
								<signUpForm.Field name="firstName">
									{(field) => (
										<Field
											label="ชื่อ"
											htmlFor={field.name}
											error={field.state.meta.errors[0]?.message}
										>
											<Input
												id={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
											/>
										</Field>
									)}
								</signUpForm.Field>
								<signUpForm.Field name="lastName">
									{(field) => (
										<Field
											label="นามสกุล"
											htmlFor={field.name}
											error={field.state.meta.errors[0]?.message}
										>
											<Input
												id={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
											/>
										</Field>
									)}
								</signUpForm.Field>
							</div>
							<signUpForm.Field name="nickname">
								{(field) => (
									<Field
										label="ชื่อเล่น"
										htmlFor={field.name}
										error={field.state.meta.errors[0]?.message}
									>
										<Input
											id={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
									</Field>
								)}
							</signUpForm.Field>
							<signUpForm.Field name="password">
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
							</signUpForm.Field>
							<signUpForm.Field name="passwordConfirm">
								{(field) => (
									<Field
										label="ยืนยันรหัสผ่าน"
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
							</signUpForm.Field>
							<p className="text-slate-500 text-xs">
								จะส่งรหัส OTP ไปที่อีเมล @{KMITL_EMAIL_DOMAIN} ของคุณ
							</p>
							<signUpForm.Subscribe selector={(s) => s.isSubmitting}>
								{(isSubmitting) => (
									<Button type="submit" className="w-full" loading={isSubmitting}>
										สมัครสมาชิก
									</Button>
								)}
							</signUpForm.Subscribe>
						</form>
					) : (
						<form
							className="space-y-4"
							onSubmit={(e) => {
								e.preventDefault()
								otpForm.handleSubmit()
							}}
						>
							<Alert tone="info">
								ส่งรหัส OTP ไปที่ {pendingEmail} แล้ว (โหมด dev: ดูใน server console)
							</Alert>
							<otpForm.Field name="otp">
								{(field) => (
									<Field
										label="รหัส OTP"
										htmlFor={field.name}
										error={field.state.meta.errors[0]?.message}
									>
										<Input
											id={field.name}
											inputMode="numeric"
											placeholder="123456"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
									</Field>
								)}
							</otpForm.Field>
							<otpForm.Subscribe selector={(s) => s.isSubmitting}>
								{(isSubmitting) => (
									<Button type="submit" className="w-full" loading={isSubmitting}>
										ยืนยัน OTP
									</Button>
								)}
							</otpForm.Subscribe>
						</form>
					)}

					<p className="text-center text-slate-500 text-sm">
						มีบัญชีอยู่แล้ว?{' '}
						<Link to="/sign-in" className="text-brand-600 hover:underline">
							เข้าสู่ระบบ
						</Link>
					</p>
				</CardBody>
			</Card>
		</div>
	)
}
