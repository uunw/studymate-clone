import { calculateGpa, formatTerm, formatThaiDate, isPassing } from '@repo/core/utils'
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState } from '@repo/ui'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { myTranscriptQuery } from '~/queries'
import { deleteTranscript, uploadTranscript } from '~/server/transcript'

export const Route = createFileRoute('/my-subjects')({
	beforeLoad: ({ context }) => {
		if (!context.user) throw redirect({ to: '/sign-in' })
	},
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(myTranscriptQuery())
	},
	component: MySubjects,
})

function MySubjects() {
	const { user } = Route.useRouteContext()
	const qc = useQueryClient()
	const { data } = useSuspenseQuery(myTranscriptQuery())

	const [file, setFile] = useState<File | null>(null)
	const [uploading, setUploading] = useState(false)
	const [uploadResult, setUploadResult] = useState<{
		tone: 'success' | 'error'
		message: string
	} | null>(null)
	const [deleting, setDeleting] = useState(false)

	if (!user) return null

	async function onUpload(e: React.FormEvent) {
		e.preventDefault()
		if (!file) return
		setUploading(true)
		setUploadResult(null)
		try {
			const fd = new FormData()
			fd.append('file', file)
			const res = await uploadTranscript({ data: fd })
			await qc.invalidateQueries({ queryKey: ['my-transcript'] })
			setFile(null)
			setUploadResult({
				tone: 'success',
				message: `นำเข้าสำเร็จ ${res.imported} รายวิชา จากทั้งหมด ${res.parsed} รายการ`,
			})
		} catch {
			setUploadResult({ tone: 'error', message: 'อัปโหลด transcript ไม่สำเร็จ กรุณาลองใหม่' })
		} finally {
			setUploading(false)
		}
	}

	async function onDelete() {
		setDeleting(true)
		try {
			await deleteTranscript()
			await qc.invalidateQueries({ queryKey: ['my-transcript'] })
			setUploadResult(null)
		} finally {
			setDeleting(false)
		}
	}

	return (
		<div className="mx-auto max-w-3xl space-y-6 py-4">
			<header>
				<h1 className="font-bold text-2xl text-slate-900 tracking-tight">วิชาของฉัน</h1>
				<p className="mt-1 text-slate-600 text-sm">นำเข้า transcript เพื่อดู GPA และความก้าวหน้า</p>
			</header>

			{uploadResult && <Alert tone={uploadResult.tone}>{uploadResult.message}</Alert>}

			{!data ? (
				<Card>
					<CardBody className="space-y-4">
						<EmptyState
							title="ยังไม่มี transcript"
							description="อัปโหลดไฟล์ transcript (PDF) เพื่อเริ่มต้นใช้งาน"
						/>
						<form className="space-y-3" onSubmit={onUpload}>
							<input
								type="file"
								accept="application/pdf"
								onChange={(e) => setFile(e.target.files?.[0] ?? null)}
								className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-medium file:text-brand-700 file:text-sm hover:file:bg-brand-100"
							/>
							<Button type="submit" loading={uploading} disabled={!file}>
								อัปโหลด transcript
							</Button>
						</form>
					</CardBody>
				</Card>
			) : (
				<TranscriptView
					details={data.details}
					createdAt={data.transcript.createdAt}
					onDelete={onDelete}
					deleting={deleting}
				/>
			)}
		</div>
	)
}

type Detail = {
	id: number
	subjectId: string | null
	grade: string | null
	nameTh: string | null
	credit: number | null
	year: number | null
	term: number | null
}

function TranscriptView({
	details,
	createdAt,
	onDelete,
	deleting,
}: {
	details: Detail[]
	createdAt: string | Date
	onDelete: () => void
	deleting: boolean
}) {
	const gpa = calculateGpa(details.map((d) => ({ grade: d.grade ?? '', credit: d.credit ?? 0 })))
	const uploadedAt = formatThaiDate(new Date(createdAt))

	return (
		<div className="space-y-6">
			<Card>
				<CardBody className="flex items-center justify-between gap-4">
					<div>
						<p className="text-slate-500 text-sm">เกรดเฉลี่ยสะสม (GPAX)</p>
						<p className="font-bold text-3xl text-brand-700">{gpa.toFixed(2)}</p>
					</div>
					<div className="text-right text-slate-400 text-xs">
						<p>{details.length} รายวิชา</p>
						<p>นำเข้าเมื่อ {uploadedAt}</p>
					</div>
				</CardBody>
			</Card>

			<Card>
				<CardHeader className="flex items-center justify-between">
					<h2 className="font-semibold text-slate-900">รายวิชาทั้งหมด</h2>
					<Button variant="danger" size="sm" loading={deleting} onClick={onDelete}>
						ลบ transcript
					</Button>
				</CardHeader>
				<CardBody className="p-0">
					{details.length === 0 ? (
						<div className="p-5">
							<EmptyState title="ไม่มีรายวิชาที่ตรงกับฐานข้อมูล" />
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-left text-sm">
								<thead>
									<tr className="border-slate-100 border-b text-slate-500">
										<th className="px-5 py-2 font-medium">รหัสวิชา</th>
										<th className="px-5 py-2 font-medium">ชื่อวิชา</th>
										<th className="px-5 py-2 font-medium">ภาคเรียน</th>
										<th className="px-5 py-2 font-medium">เกรด</th>
									</tr>
								</thead>
								<tbody>
									{details.map((d) => (
										<tr key={d.id} className="border-slate-50 border-b last:border-0">
											<td className="px-5 py-2 font-medium text-slate-700">{d.subjectId ?? '—'}</td>
											<td className="px-5 py-2 text-slate-700">{d.nameTh ?? '—'}</td>
											<td className="px-5 py-2 text-slate-500">
												{d.year != null && d.term != null ? formatTerm(d.year, d.term) : '—'}
											</td>
											<td className="px-5 py-2">
												{d.grade ? (
													<Badge tone={isPassing(d.grade) ? 'green' : 'red'}>{d.grade}</Badge>
												) : (
													<span className="text-slate-400">—</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</CardBody>
			</Card>
		</div>
	)
}
