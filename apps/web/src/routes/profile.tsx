import { profileSchema } from '@repo/core/schemas'
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, Select } from '@repo/ui'
import { useForm } from '@tanstack/react-form'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { curriculaQuery } from '~/queries'
import { selectCurriculum, updateAvatar, updateProfile } from '~/server/profile'

const AVATAR_STYLE = 'thumbs'
const avatarUrl = (seed: string) =>
	`https://api.dicebear.com/9.x/${AVATAR_STYLE}/svg?seed=${encodeURIComponent(seed)}`
const randomSeeds = () => Array.from({ length: 8 }, () => Math.random().toString(36).slice(2, 10))

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
	const [seeds, setSeeds] = useState<string[]>(randomSeeds)
	const [avatarBusy, setAvatarBusy] = useState(false)

	async function pickAvatar(url: string) {
		setAvatarBusy(true)
		try {
			await updateAvatar({ data: url })
			await router.invalidate()
		} finally {
			setAvatarBusy(false)
		}
	}

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
						<Select
							id="curriculum"
							className="w-full"
							value={user.curriculumId ?? ''}
							onChange={(e) => onSelectCurriculum(e.target.value)}
						>
							<option value="" disabled>
								เลือกหลักสูตร
							</option>
							{curricula.map((c) => (
								<option key={c.id} value={c.id}>
									{c.nameTh} ({c.year})
								</option>
							))}
						</Select>
					</Field>
				</CardBody>
			</Card>

			<Card>
				<CardHeader>
					<h2 className="font-semibold text-slate-900">รูปโปรไฟล์</h2>
				</CardHeader>
				<CardBody className="space-y-4">
					<div className="flex items-center gap-4">
						<img
							src={user.image ?? avatarUrl(user.id)}
							alt="รูปโปรไฟล์ปัจจุบัน"
							className="h-16 w-16 rounded-full border border-slate-200 bg-white"
						/>
						<div>
							<p className="font-medium text-slate-800 text-sm">รูปปัจจุบัน</p>
							<p className="text-slate-500 text-xs">เลือกรูปแบบสุ่มด้านล่าง</p>
						</div>
					</div>
					<div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
						{seeds.map((seed, i) => {
							const url = avatarUrl(seed)
							return (
								<button
									key={seed}
									type="button"
									disabled={avatarBusy}
									onClick={() => pickAvatar(url)}
									aria-label={`เลือกรูปโปรไฟล์แบบที่ ${i + 1}`}
									className="rounded-full border-2 border-transparent transition-colors hover:border-brand-400 disabled:opacity-50 motion-reduce:transition-none"
								>
									<img src={url} alt="" className="h-12 w-12 rounded-full bg-white" />
								</button>
							)
						})}
					</div>
					<Button variant="ghost" size="sm" onClick={() => setSeeds(randomSeeds())}>
						สุ่มรูปใหม่
					</Button>
				</CardBody>
			</Card>
		</div>
	)
}
