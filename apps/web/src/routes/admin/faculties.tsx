import { facultySchema } from '@repo/core/schemas'
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
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { facultiesQuery } from '~/queries'
import { deleteFaculty, saveFaculty } from '~/server/admin'

export const Route = createFileRoute('/admin/faculties')({
	beforeLoad: ({ context }) => {
		if (!context.user) throw redirect({ to: '/sign-in' })
		if (!context.user.isAdmin) throw redirect({ to: '/' })
	},
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(facultiesQuery())
	},
	component: FacultiesManager,
})

function FacultiesManager() {
	const qc = useQueryClient()
	const { data: faculties } = useSuspenseQuery(facultiesQuery())
	const [editingId, setEditingId] = useState<number | null>(null)
	const [error, setError] = useState<string | null>(null)

	const defaultValues = { kmitlId: '', nameTh: '', nameEn: '', isVisible: true }

	const form = useForm({
		defaultValues,
		validators: { onSubmit: facultySchema },
		onSubmit: async ({ value, formApi }) => {
			setError(null)
			try {
				await saveFaculty({ data: { ...value, id: editingId ?? undefined } })
				qc.invalidateQueries({ queryKey: ['faculties'] })
				formApi.reset()
				setEditingId(null)
			} catch {
				setError('บันทึกไม่สำเร็จ')
			}
		},
	})

	const onEdit = (row: (typeof faculties)[number]) => {
		setEditingId(row.id)
		form.setFieldValue('kmitlId', row.kmitlId ?? '')
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
			await deleteFaculty({ data: { id } })
			qc.invalidateQueries({ queryKey: ['faculties'] })
			if (editingId === id) onCancel()
		} catch {
			setError('ลบไม่สำเร็จ')
		}
	}

	return (
		<div className="space-y-6">
			<h1 className="font-bold text-2xl text-slate-900">จัดการคณะ</h1>

			<Card>
				<CardHeader>
					<h2 className="font-semibold text-slate-900">{editingId ? 'แก้ไขคณะ' : 'เพิ่มคณะ'}</h2>
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
						<form.Field name="kmitlId">
							{(field) => (
								<Field
									label="รหัส KMITL"
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

			{faculties.length === 0 ? (
				<EmptyState title="ยังไม่มีคณะ" description="เพิ่มคณะแรกด้วยฟอร์มด้านบน" />
			) : (
				<div className="space-y-2">
					{faculties.map((row) => (
						<Card key={row.id}>
							<CardBody className="flex items-center justify-between gap-4">
								<div>
									<p className="font-medium text-slate-900">{row.nameTh}</p>
									<p className="text-slate-500 text-sm">{row.nameEn}</p>
								</div>
								<div className="flex items-center gap-2">
									{row.isVisible !== 1 && <Badge tone="slate">ซ่อน</Badge>}
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
