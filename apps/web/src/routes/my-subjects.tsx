import {
	allocateProgress,
	type ProgressGroupResult,
	type ProgressResult,
	termGpa,
} from '@repo/core/progress'
import { formatThaiDate, isPassing } from '@repo/core/utils'
import {
	Alert,
	Badge,
	Button,
	Card,
	CardBody,
	CardHeader,
	EmptyState,
	Modal,
	ProgressBar,
	Tabs,
} from '@repo/ui'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { myCurriculumTreeQuery, myTranscriptQuery } from '~/queries'
import { acceptPolicy } from '~/server/profile'
import type { CurriculumTree } from '~/server/progress'
import { deleteTranscript, uploadTranscript } from '~/server/transcript'

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
	component: MySubjects,
})

type Detail = {
	id: number
	subjectId: string | null
	grade: string | null
	nameTh: string | null
	nameEn: string | null
	credit: number | null
	year: number | null
	term: number | null
}

const TABS = [
	{ value: 'transcript', label: 'Transcript' },
	{ value: 'progress', label: 'ความก้าวหน้าหลักสูตร' },
	{ value: 'grades', label: 'คำนวณเกรด' },
] as const

function MySubjects() {
	const { user } = Route.useRouteContext()
	const qc = useQueryClient()
	const { data } = useSuspenseQuery(myTranscriptQuery())
	const { data: tree } = useSuspenseQuery(myCurriculumTreeQuery())

	const [file, setFile] = useState<File | null>(null)
	const [uploading, setUploading] = useState(false)
	const [uploadResult, setUploadResult] = useState<{
		tone: 'success' | 'error'
		message: string
	} | null>(null)
	const [deleting, setDeleting] = useState(false)
	const [tab, setTab] = useState<string>('transcript')

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
					<Tabs tabs={TABS} value={tab} onChange={setTab} />
					{tab === 'transcript' && (
						<TranscriptView
							details={data.details}
							createdAt={data.transcript.createdAt}
							onDelete={onDelete}
							deleting={deleting}
						/>
					)}
					{tab === 'progress' && <ProgressView details={data.details} tree={tree} />}
					{tab === 'grades' && <GradeTracker details={data.details} />}
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

// ---- Transcript tab ----

type TermGroup = { key: string; year: number | null; term: number | null; items: Detail[] }

function groupByTerm(details: Detail[]): TermGroup[] {
	const groups = new Map<string, TermGroup>()
	for (const d of details) {
		const key = d.year != null && d.term != null ? `${d.year}-${d.term}` : 'transfer'
		const g = groups.get(key)
		if (g) g.items.push(d)
		else groups.set(key, { key, year: d.year, term: d.term, items: [d] })
	}
	return [...groups.values()].sort((a, b) => {
		const rank = (g: TermGroup) => (g.year == null ? -1 : g.year * 10 + (g.term ?? 0))
		return rank(a) - rank(b)
	})
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
	const { finalGpa } = termGpa(
		details.map((d) => ({
			grade: d.grade ?? '',
			credit: d.credit ?? 0,
			year: d.year,
			term: d.term,
		})),
	)
	const totalCredit = details.reduce(
		(s, d) => s + (isPassing(d.grade ?? '') ? (d.credit ?? 0) : 0),
		0,
	)
	const uploadedAt = formatThaiDate(new Date(createdAt))
	const groups = groupByTerm(details)

	return (
		<div className="space-y-6">
			<Card>
				<CardBody className="flex items-center justify-between gap-4">
					<div>
						<p className="text-slate-500 text-sm">เกรดเฉลี่ยสะสม (GPAX)</p>
						<p className="font-bold text-3xl text-brand-700">{finalGpa.toFixed(2)}</p>
					</div>
					<div className="text-right text-slate-400 text-xs">
						<p>
							{details.length} รายวิชา · {totalCredit} หน่วยกิตสะสม
						</p>
						<p>นำเข้าเมื่อ {uploadedAt}</p>
						<Button
							variant="danger"
							size="sm"
							loading={deleting}
							onClick={onDelete}
							className="mt-2"
						>
							ลบ transcript
						</Button>
					</div>
				</CardBody>
			</Card>

			{groups.length === 0 ? (
				<EmptyState title="ไม่พบรายวิชาใน transcript" />
			) : (
				groups.map((g) => (
					<Card key={g.key}>
						<CardHeader>
							<h2 className="font-semibold text-slate-900">
								{g.year == null ? 'หน่วยกิตเทียบโอน' : `ปีการศึกษา ${g.year} · ภาคเรียนที่ ${g.term}`}
							</h2>
							{g.year == null && <p className="text-slate-400 text-xs">Transfer Credit</p>}
						</CardHeader>
						<CardBody className="divide-y divide-slate-50 p-0">
							{g.items.map((d) => (
								<div key={d.id} className="flex items-center gap-3 px-5 py-3">
									<div className="min-w-0 flex-1">
										<p className="truncate font-medium text-slate-800 text-sm">
											{d.subjectId} {d.nameTh ?? d.nameEn ?? ''}
										</p>
										{d.nameTh && d.nameEn && (
											<p className="truncate text-slate-400 text-xs">{d.nameEn}</p>
										)}
									</div>
									<span className="shrink-0 text-slate-500 text-sm">{d.credit ?? '-'} นก.</span>
									{d.grade && (
										<Badge tone={isPassing(d.grade) ? 'green' : d.grade === 'T' ? 'slate' : 'red'}>
											{d.grade}
										</Badge>
									)}
								</div>
							))}
						</CardBody>
					</Card>
				))
			)}
		</div>
	)
}

// ---- Progress tab ----

function ProgressView({ details, tree }: { details: Detail[]; tree: CurriculumTree | null }) {
	const [includeX, setIncludeX] = useState(false)

	const progress: ProgressResult | null = useMemo(() => {
		if (!tree) return null
		const completed = details
			.filter((d) => d.subjectId && d.grade)
			.map((d) => ({
				subjectId: d.subjectId as string,
				credit: d.credit ?? 0,
				grade: d.grade as string,
			}))
		return allocateProgress(tree.root, completed, { includeX })
	}, [tree, details, includeX])

	const courseInfo = useMemo(() => {
		const m = new Map<string, { name: string; grade: string | null }>()
		for (const d of details) {
			if (d.subjectId) m.set(d.subjectId, { name: d.nameTh ?? d.nameEn ?? '', grade: d.grade })
		}
		return m
	}, [details])

	if (!tree) {
		return (
			<Card>
				<CardBody className="space-y-3">
					<EmptyState
						title="ยังไม่ได้เลือกหลักสูตร"
						description="เลือกหลักสูตรของคุณในหน้าโปรไฟล์ เพื่อดูความก้าวหน้าตามโครงสร้างหลักสูตร"
					/>
					<Link to="/profile" className="text-brand-700 text-sm hover:underline">
						ไปที่โปรไฟล์ →
					</Link>
				</CardBody>
			</Card>
		)
	}
	if (!progress) return null

	return (
		<div className="space-y-5">
			<Card>
				<CardBody className="space-y-4">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="font-semibold text-slate-900">{tree.curriculum.nameTh}</p>
							<p className="text-slate-400 text-xs">
								{tree.curriculum.nameEn} {tree.curriculum.year ? `· ${tree.curriculum.year}` : ''}
							</p>
						</div>
						<Badge tone={progress.complete ? 'green' : 'brand'}>
							{progress.complete ? 'ครบหลักสูตร' : `${progress.percent}%`}
						</Badge>
					</div>
					<div className="grid grid-cols-3 gap-3 text-center">
						<Stat label="ลงเรียนแล้ว" value={progress.totalUsed} tone="text-brand-700" />
						<Stat label="ยังขาด" value={progress.remaining} tone="text-amber-600" />
						<Stat label="รวมทั้งหลักสูตร" value={progress.totalRequired} tone="text-slate-700" />
					</div>
					<ProgressBar percent={progress.percent} tone={progress.complete ? 'green' : 'brand'} />
					<label className="flex items-center gap-2 text-slate-500 text-xs">
						<input
							type="checkbox"
							checked={includeX}
							onChange={(e) => setIncludeX(e.target.checked)}
						/>
						รวมวิชาเกรด X (ไม่สมบูรณ์) ในการคำนวณ
					</label>
				</CardBody>
			</Card>

			<div className="space-y-3">
				{progress.root.children.map((g) => (
					<GroupNode key={g.id} group={g} courseInfo={courseInfo} depth={0} />
				))}
			</div>

			{progress.unplaced.length > 0 && (
				<Card>
					<CardBody>
						<p className="font-medium text-slate-700 text-sm">
							วิชาที่ยังไม่ถูกจัดเข้ากลุ่ม ({progress.unplaced.length})
						</p>
						<p className="mt-1 text-slate-400 text-xs">
							{progress.unplaced.map((id) => courseInfo.get(id)?.name || id).join(', ')}
						</p>
					</CardBody>
				</Card>
			)}
		</div>
	)
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
	return (
		<div className="rounded-lg bg-slate-50 py-3">
			<p className={`font-bold text-2xl ${tone}`}>{value}</p>
			<p className="text-slate-400 text-xs">{label}</p>
		</div>
	)
}

function GroupNode({
	group,
	courseInfo,
	depth,
}: {
	group: ProgressGroupResult
	courseInfo: Map<string, { name: string; grade: string | null }>
	depth: number
}) {
	const hasChildren = group.children.length > 0
	return (
		<div
			className="rounded-lg border border-slate-200 bg-white p-3"
			style={{ marginLeft: depth > 0 ? depth * 12 : 0 }}
		>
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					{group.color && (
						<span
							className="h-2.5 w-2.5 shrink-0 rounded-full"
							style={{ background: group.color }}
						/>
					)}
					<span className="font-medium text-slate-800 text-sm">{group.name}</span>
					{group.complete && <Badge tone="green">✓</Badge>}
				</div>
				<span className="shrink-0 text-slate-500 text-xs">
					{group.used}/{group.required} นก.
				</span>
			</div>
			<ProgressBar
				className="mt-2"
				percent={group.required === 0 ? 0 : Math.min(100, (group.used / group.required) * 100)}
				tone={group.complete ? 'green' : 'brand'}
			/>

			{!hasChildren && group.matched.length > 0 && (
				<ul className="mt-2 space-y-0.5">
					{group.matched.map((id) => (
						<li key={id} className="flex items-center justify-between text-slate-500 text-xs">
							<span className="truncate">
								{id} {courseInfo.get(id)?.name ?? ''}
							</span>
							{courseInfo.get(id)?.grade && (
								<span className="ml-2 shrink-0 font-medium text-green-600">
									{courseInfo.get(id)?.grade}
								</span>
							)}
						</li>
					))}
				</ul>
			)}

			{hasChildren && (
				<div className="mt-3 space-y-2">
					{group.children.map((c) => (
						<GroupNode key={c.id} group={c} courseInfo={courseInfo} depth={depth + 1} />
					))}
				</div>
			)}
		</div>
	)
}

// ---- Grade tracker tab (what-if) ----

const GRADE_OPTIONS = ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F', 'S', 'U', 'T', 'W']

function GradeTracker({ details }: { details: Detail[] }) {
	const [overrides, setOverrides] = useState<Map<number, string>>(new Map())

	const effective = useMemo(
		() => details.map((d) => ({ ...d, grade: overrides.get(d.id) ?? d.grade })),
		[details, overrides],
	)
	const { terms, finalGpa } = useMemo(
		() =>
			termGpa(
				effective.map((d) => ({
					grade: d.grade ?? '',
					credit: d.credit ?? 0,
					year: d.year,
					term: d.term,
				})),
			),
		[effective],
	)
	const dirty = overrides.size > 0

	function setGrade(id: number, grade: string) {
		setOverrides((prev) => {
			const next = new Map(prev)
			next.set(id, grade)
			return next
		})
	}

	const byTerm = useMemo(() => {
		const m = new Map<string, Detail[]>()
		for (const d of effective) {
			const key = d.year != null && d.term != null ? `${d.year}-${d.term}` : 'transfer'
			const list = m.get(key) ?? []
			list.push(d)
			m.set(key, list)
		}
		return m
	}, [effective])

	return (
		<div className="space-y-5">
			<Card>
				<CardBody className="flex items-center justify-between gap-4">
					<div>
						<p className="text-slate-500 text-sm">GPAX ที่คำนวณ {dirty && '(จำลอง)'}</p>
						<p className="font-bold text-3xl text-brand-700">{finalGpa.toFixed(2)}</p>
					</div>
					{dirty && (
						<Button variant="ghost" size="sm" onClick={() => setOverrides(new Map())}>
							รีเซ็ตเกรด
						</Button>
					)}
				</CardBody>
			</Card>

			{terms.map((t) => (
				<Card key={t.key}>
					<CardHeader className="flex items-center justify-between">
						<h2 className="font-semibold text-slate-900 text-sm">
							{t.year == null ? 'หน่วยกิตเทียบโอน' : `ปีการศึกษา ${t.year} · ภาคเรียนที่ ${t.term}`}
						</h2>
						{t.year != null && (
							<span className="text-slate-400 text-xs">
								GPS {t.gps.toFixed(2)} · GPA {t.gpa.toFixed(2)}
							</span>
						)}
					</CardHeader>
					<CardBody className="divide-y divide-slate-50 p-0">
						{(byTerm.get(t.key) ?? []).map((d) => (
							<div key={d.id} className="flex items-center gap-3 px-5 py-2.5">
								<div className="min-w-0 flex-1">
									<p className="truncate text-slate-700 text-sm">
										{d.subjectId} {d.nameTh ?? d.nameEn ?? ''}
									</p>
								</div>
								<span className="shrink-0 text-slate-400 text-xs">{d.credit ?? '-'} นก.</span>
								<select
									value={d.grade ?? ''}
									onChange={(e) => setGrade(d.id, e.target.value)}
									className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-sm"
								>
									{!d.grade && <option value="">-</option>}
									{GRADE_OPTIONS.map((g) => (
										<option key={g} value={g}>
											{g}
										</option>
									))}
								</select>
							</div>
						))}
					</CardBody>
				</Card>
			))}
		</div>
	)
}
