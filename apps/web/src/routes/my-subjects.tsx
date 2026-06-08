import { Alert, Button, Card, CardBody, EmptyState, Modal } from '@repo/ui'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { myCurriculumTreeQuery, myTranscriptQuery } from '~/queries'
import { acceptPolicy } from '~/server/profile'
import { uploadTranscript } from '~/server/transcript'

export const Route = createFileRoute('/my-subjects')({
	beforeLoad: ({ context }) => {
		if (!context.user) throw redirect({ to: '/sign-in' })
	},
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(myTranscriptQuery()),
			context.queryClient.ensureQueryData(myCurriculumTreeQuery()),
		])
	},
	component: MySubjectsLayout,
})

const TABS = [
	{ to: '/my-subjects/transcript', label: 'Transcript' },
	{ to: '/my-subjects/progress', label: 'ความก้าวหน้าหลักสูตร' },
	{ to: '/my-subjects/grades', label: 'คำนวณเกรด' },
	{ to: '/my-subjects/plan', label: 'แนะนำลงทะเบียน' },
] as const

function MySubjectsLayout() {
	const { user } = Route.useRouteContext()
	const qc = useQueryClient()
	const { data } = useSuspenseQuery(myTranscriptQuery())

	const [file, setFile] = useState<File | null>(null)
	const [uploading, setUploading] = useState(false)
	const [uploadResult, setUploadResult] = useState<{
		tone: 'success' | 'error'
		message: string
	} | null>(null)

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

	return (
		<div className="mx-auto max-w-3xl space-y-6 py-4">
			{!user.policyViewed && <PolicyGate />}
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
								aria-label="เลือกไฟล์ transcript (PDF)"
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
				<>
					<nav className="flex gap-1 border-slate-200 border-b">
						{TABS.map((t) => (
							<Link
								key={t.to}
								to={t.to}
								className="-mb-px border-transparent border-b-2 px-4 py-2.5 font-medium text-slate-500 text-sm transition-colors hover:text-slate-800 [&.active]:border-brand-600 [&.active]:text-brand-700"
							>
								{t.label}
							</Link>
						))}
					</nav>
					<Outlet />
				</>
			)}
		</div>
	)
}

// ---- Privacy-policy gate (shown on first transcript access) ----

function PolicyGate() {
	const router = useRouter()
	const [busy, setBusy] = useState(false)

	async function accept() {
		setBusy(true)
		try {
			await acceptPolicy()
			await router.invalidate()
		} finally {
			setBusy(false)
		}
	}

	return (
		<Modal open dismissable={false} title="นโยบายความเป็นส่วนตัว">
			<div className="space-y-4">
				<p className="text-slate-600 text-sm">
					การอัปโหลด transcript จะนำข้อมูลผลการเรียนของคุณมาใช้คำนวณ GPA
					และความก้าวหน้าหลักสูตรภายในระบบนี้เท่านั้น ข้อมูลจะไม่ถูกเปิดเผยต่อบุคคลอื่น คุณสามารถลบ transcript
					ได้ตลอดเวลา
				</p>
				<Link to="/privacy-policy" className="text-brand-700 text-sm hover:underline">
					อ่านนโยบายฉบับเต็ม →
				</Link>
				<Button onClick={accept} loading={busy} className="w-full">
					ยอมรับและดำเนินการต่อ
				</Button>
			</div>
		</Modal>
	)
}
