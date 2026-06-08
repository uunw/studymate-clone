import { strongPassword, studentId } from '@repo/core/schemas'
import { Alert, Button, Card, CardBody, Field, Input } from '@repo/ui'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { authClient } from '~/lib/auth-client'

export const Route = createFileRoute('/sign-up')({
	beforeLoad: ({ context }) => {
		if (context.user) throw redirect({ to: '/' })
	},
	component: SignUp,
})

const signUpForm = z
	.object({
		studentId,
		firstName: z.string().trim().min(1, 'กรุณากรอกชื่อ'),
		lastName: z.string().trim().min(1, 'กรุณากรอกนามสกุล'),
		nickname: z.string().trim().min(1, 'กรุณากรอกชื่อเล่น'),
		email: z.email('อีเมลไม่ถูกต้อง'),
		password: strongPassword,
		passwordConfirm: z.string(),
	})
	.refine((v) => v.password === v.passwordConfirm, {
		message: 'ยืนยันรหัสผ่านไม่ตรงกัน',
		path: ['passwordConfirm'],
	})

function SignUp() {
	const router = useRouter()
	const [error, setError] = useState<string | null>(null)

	const form = useForm({
		defaultValues: {
			studentId: '',
			firstName: '',
			lastName: '',
			nickname: '',
			email: '',
			password: '',
			passwordConfirm: '',
		},
		validators: { onSubmit: signUpForm },
		onSubmit: async ({ value }) => {
			setError(null)
			const res = await authClient.signUp.email({
				email: value.email,
				password: value.password,
				username: value.studentId,
				name: `${value.firstName} ${value.lastName}`,
				firstName: value.firstName,
				lastName: value.lastName,
				nickname: value.nickname,
			})
			if (res.error) {
				setError(res.error.message ?? 'สมัครสมาชิกไม่สำเร็จ')
				return
			}
			await router.invalidate()
			router.navigate({ to: '/' })
		},
	})

	const field = (
		name: keyof typeof form.state.values,
		label: string,
		type = 'text',
		placeholder = '',
	) => (
		<form.Field name={name}>
			{(f) => (
				<Field label={label} htmlFor={f.name} error={f.state.meta.errors[0]?.message}>
					<Input
						id={f.name}
						type={type}
						placeholder={placeholder}
						value={f.state.value}
						onBlur={f.handleBlur}
						onChange={(e) => f.handleChange(e.target.value)}
					/>
				</Field>
			)}
		</form.Field>
	)

	return (
		<div className="mx-auto max-w-md py-8">
			<Card>
				<CardBody className="space-y-4">
					<h1 className="font-bold text-xl">สมัครสมาชิก</h1>
					{error && <Alert tone="error">{error}</Alert>}
					<form
						className="space-y-4"
						onSubmit={(e) => {
							e.preventDefault()
							form.handleSubmit()
						}}
					>
						{field('studentId', 'รหัสนักศึกษา', 'text', '64010001')}
						<div className="grid grid-cols-2 gap-3">
							{field('firstName', 'ชื่อ')}
							{field('lastName', 'นามสกุล')}
						</div>
						{field('nickname', 'ชื่อเล่น')}
						{field('email', 'อีเมล', 'email', 'you@kmitl.ac.th')}
						{field('password', 'รหัสผ่าน', 'password')}
						{field('passwordConfirm', 'ยืนยันรหัสผ่าน', 'password')}
						<form.Subscribe selector={(s) => s.isSubmitting}>
							{(isSubmitting) => (
								<Button type="submit" className="w-full" loading={isSubmitting}>
									สมัครสมาชิก
								</Button>
							)}
						</form.Subscribe>
					</form>
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
