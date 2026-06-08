import { curriculumSchema } from '@repo/core/schemas'
import {
	Alert,
	Badge,
	Button,
	Card,
	CardBody,
	CardHeader,
	EmptyState,
	Field,
	Input,
} from '@repo/ui'
import { useForm } from '@tanstack/react-form'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { curriculaQuery, programsQuery } from '~/queries'
import { deleteCurriculum, saveCurriculum } from '~/server/admin'

export const Route = createFileRoute('/admin/curricula')({
	beforeLoad: ({ context }) => {
		if (!context.user) throw redirect({ to: '/sign-in' })
		if (!context.user.isAdmin) throw redirect({ to: '/' })
	},
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(curriculaQuery()),
			context.queryClient.ensureQueryData(programsQuery()),
		])
	},
	component: CurriculaManager,
})

function CurriculaManager() {
	const qc = useQueryClient()
	const { data: curricula } = useSuspenseQuery(curriculaQuery())
	const { data: programs } = useSuspenseQuery(programsQuery())
	const [editingId, setEditingId] = useState<number | null>(null)
	const [error, setError] = useState<string | null>(null)

	const defaultValues = {
		programId: 0,
		year: new Date().getFullYear() + 543,
		nameTh: '',
		nameEn: '',
		isVisible: true,
	}

	const form = useForm({
		defaultValues,
		validators: { onSubmit: curriculumSchema },
		onSubmit: async ({ value, formApi }) => {
			setError(null)
			try {
				await saveCurriculum({ data: { ...value, id: editingId ?? undefined } })
				qc.invalidateQueries({ queryKey: ['curricula'] })
				formApi.reset()
				setEditingId(null)
			} catch {
				setError('บันทึกไม่สำเร็จ')
			}
		},
	})

	const onEdit = (row: (typeof curricula)[number]) => {
		setEditingId(row.id)
		form.setFieldValue('programId', row.programId ?? 0)
		form.setFieldValue('year', row.year ?? 0)
		form.setFieldValue('nameTh', row.nameTh ?? '')
		form.setFieldValue('nameEn', row.nameEn ?? '')
		form.setFieldValue('isVisible', Number(row.isVisible) === 1)
	}

	const onCancel = () => {
		form.reset()
		setEditingId(null)
		setError(null)
	}

	const onDelete = async (id: number) => {
		setError(null)
		try {
			await deleteCurriculum({ data: { id } })
			qc.invalidateQueries({ queryKey: ['curricula'] })
			if (editingId === id) onCancel()
		} catch {
			setError('ลบไม่สำเร็จ')
		}
	}

	const programName = (id: number) => programs.find((p) => p.id === id)?.nameTh ?? '—'

	return (
		<div className="space-y-6">
			<h1 className="font-bold text-2xl text-slate-900">จัดการหลักสูตร</h1>

			<Card>
				<CardHeader>
					<h2 className="font-semibold text-slate-900">{editingId ? 'แก้ไขหลักสูตร' : 'เพิ่มหลักสูตร'}</h2>
				</CardHeader>
				<CardBody className="space-y-4">
					{error && <Alert tone="error">{error}</Alert>}
					<form
						className="space-y-4"
						onSubmit={(e) => {
							e.preventDefault()
							form.handleSubmit()
						}}
					>
						<form.Field name="programId">
							{(field) => (
								<Field
									label="สาขาวิชา"
									htmlFor={field.name}
									error={field.state.meta.errors[0]?.message}
								>
									<select
										id={field.name}
										className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(Number(e.target.value))}
									>
										<option value={0} disabled>
											เลือกสาขาวิชา
										</option>
										{programs.map((p) => (
											<option key={p.id} value={p.id}>
												{p.nameTh}
											</option>
										))}
									</select>
								</Field>
							)}
						</form.Field>
						<form.Field name="year">
							{(field) => (
								<Field
									label="ปีการศึกษา (พ.ศ.)"
									htmlFor={field.name}
									error={field.state.meta.errors[0]?.message}
								>
									<Input
										id={field.name}
										type="number"
										inputMode="numeric"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(Number(e.target.value))}
									/>
								</Field>
							)}
						</form.Field>
						<form.Field name="nameTh">
							{(field) => (
								<Field
									label="ชื่อ (ไทย)"
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
						</form.Field>
						<form.Field name="nameEn">
							{(field) => (
								<Field
									label="ชื่อ (อังกฤษ)"
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
						</form.Field>
						<form.Field name="isVisible">
							{(field) => (
								<label className="flex items-center gap-2 text-slate-700 text-sm">
									<input
										type="checkbox"
										checked={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.checked)}
									/>
									แสดงผล
								</label>
							)}
						</form.Field>
						<div className="flex gap-2">
							<form.Subscribe selector={(s) => s.isSubmitting}>
								{(isSubmitting) => (
									<Button type="submit" loading={isSubmitting}>
										{editingId ? 'บันทึก' : 'เพิ่ม'}
									</Button>
								)}
							</form.Subscribe>
							{editingId && (
								<Button type="button" variant="ghost" onClick={onCancel}>
									ยกเลิก
								</Button>
							)}
						</div>
					</form>
				</CardBody>
			</Card>

			{curricula.length === 0 ? (
				<EmptyState title="ยังไม่มีหลักสูตร" description="เพิ่มหลักสูตรแรกด้วยฟอร์มด้านบน" />
			) : (
				<div className="space-y-2">
					{curricula.map((row) => (
						<Card key={row.id}>
							<CardBody className="flex items-center justify-between gap-4">
								<div>
									<p className="font-medium text-slate-900">
										{row.nameTh} <span className="text-slate-400">({row.year})</span>
									</p>
									<p className="text-slate-500 text-sm">
										{row.nameEn} · {programName(row.programId ?? 0)}
									</p>
								</div>
								<div className="flex items-center gap-2">
									{Number(row.isVisible) !== 1 && <Badge tone="slate">ซ่อน</Badge>}
									<Link
										to="/admin/curriculum-group/$curriculumId"
										params={{ curriculumId: String(row.id) }}
										className="inline-flex items-center rounded-lg bg-brand-50 px-3 py-1.5 font-medium text-brand-700 text-sm hover:bg-brand-100"
									>
										จัดการกลุ่ม
									</Link>
									<Button size="sm" variant="secondary" onClick={() => onEdit(row)}>
										แก้ไข
									</Button>
									<Button size="sm" variant="danger" onClick={() => onDelete(row.id)}>
										ลบ
									</Button>
								</div>
							</CardBody>
						</Card>
					))}
				</div>
			)}
		</div>
	)
}
