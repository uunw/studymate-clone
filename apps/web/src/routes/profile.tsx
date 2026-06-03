import { profileSchema } from '@repo/core/schemas'
import { Alert, Button, Card, CardBody, CardHeader, Field, Input } from '@repo/ui'
import { useForm } from '@tanstack/react-form'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { curriculaQuery } from '~/queries'
import { selectCurriculum, updateProfile } from '~/server/profile'

export const Route = createFileRoute('/profile')({
	beforeLoad: ({ context }) => {
		if (!context.user) throw redirect({ to: '/sign-in' })
	},
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(curriculaQuery())
	},
	component: Profile,
})

function Profile() {
	const { user } = Route.useRouteContext()
	const router = useRouter()
	const { data: curricula } = useSuspenseQuery(curriculaQuery())

	const [profileSaved, setProfileSaved] = useState(false)
	const [curriculumError, setCurriculumError] = useState<string | null>(null)

	const profileForm = useForm({
		defaultValues: {
			firstName: user?.firstName ?? '',
			lastName: user?.lastName ?? '',
			nickname: user?.nickname ?? '',
		},
		validators: { onSubmit: profileSchema },
		onSubmit: async ({ value }) => {
			setProfileSaved(false)
			await updateProfile({ data: value })
			await router.invalidate()
			setProfileSaved(true)
		},
	})

	if (!user) return null

	async function onSelectCurriculum(value: string) {
		const curriculumId = Number(value)
		if (!Number.isFinite(curriculumId) || curriculumId <= 0) return
		setCurriculumError(null)
		try {
			await selectCurriculum({ data: { curriculumId } })
			await router.invalidate()
		} catch {
			setCurriculumError('บันทึกหลักสูตรไม่สำเร็จ กรุณาลองใหม่')
		}
	}

	return (
		<div className="mx-auto max-w-2xl space-y-6 py-4">
			<header>
				<h1 className="font-bold text-2xl text-slate-900 tracking-tight">โปรไฟล์</h1>
				<p className="mt-1 text-slate-600 text-sm">{user.email}</p>
			</header>

			<Card>
				<CardHeader>
					<h2 className="font-semibold text-slate-900">ข้อมูลส่วนตัว</h2>
				</CardHeader>
				<CardBody className="space-y-4">
					{profileSaved && <Alert tone="success">บันทึกข้อมูลเรียบร้อยแล้ว</Alert>}
					<form
						className="space-y-4"
						onSubmit={(e) => {
							e.preventDefault()
							profileForm.handleSubmit()
						}}
					>
						<profileForm.Field name="firstName">
							{(field) => (
								<Field label="ชื่อ" htmlFor={field.name} error={field.state.meta.errors[0]?.message}>
									<Input
										id={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								</Field>
							)}
						</profileForm.Field>
						<profileForm.Field name="lastName">
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
						</profileForm.Field>
						<profileForm.Field name="nickname">
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
						</profileForm.Field>
						<profileForm.Subscribe selector={(s) => s.isSubmitting}>
							{(isSubmitting) => (
								<Button type="submit" loading={isSubmitting}>
									บันทึกข้อมูล
								</Button>
							)}
						</profileForm.Subscribe>
					</form>
				</CardBody>
			</Card>

			<Card>
				<CardHeader>
					<h2 className="font-semibold text-slate-900">หลักสูตร</h2>
				</CardHeader>
				<CardBody className="space-y-3">
					{curriculumError && <Alert tone="error">{curriculumError}</Alert>}
					<Field label="เลือกหลักสูตรของคุณ" htmlFor="curriculum">
						<select
							id="curriculum"
							className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
							value={user.curriculumId ?? ''}
							onChange={(e) => onSelectCurriculum(e.target.value)}
						>
							<option value="" disabled>
								— เลือกหลักสูตร —
							</option>
							{curricula.map((c) => (
								<option key={c.id} value={c.id}>
									{c.nameTh} ({c.year})
								</option>
							))}
						</select>
					</Field>
				</CardBody>
			</Card>
		</div>
	)
}
