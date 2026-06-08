import {
	allocateProgress,
	type ProgressGroupResult,
	type ProgressResult,
} from '@repo/core/progress'
import { Badge, Card, CardBody, EmptyState, ProgressBar } from '@repo/ui'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { Detail } from '~/components/my-subjects-types'
import { myCurriculumTreeQuery, myTranscriptQuery, registrationPlanQuery } from '~/queries'
import type { CurriculumTree } from '~/server/progress'

export const Route = createFileRoute('/my-subjects/progress')({
	component: ProgressTab,
})

function ProgressTab() {
	const { data } = useSuspenseQuery(myTranscriptQuery())
	const { data: tree } = useSuspenseQuery(myCurriculumTreeQuery())
	// Recommended-this-term subjects (registrar pre-reg plan) — non-blocking.
	const { data: plan } = useQuery(registrationPlanQuery())
	const planned = useMemo(
		() =>
			(plan?.items ?? [])
				.filter((i) => !i.taken)
				.map((i) => ({ subjectId: i.subjectId, credit: i.credit ?? 0 })),
		[plan],
	)
	if (!data) return null
	return <ProgressView details={data.details} tree={tree} planned={planned} />
}

type Planned = { subjectId: string; credit: number }

type GroupSubjectInfo = { id: string; name: string; credit: number }

function ProgressView({
	details,
	tree,
	planned,
}: {
	details: Detail[]
	tree: CurriculumTree | null
	planned: Planned[]
}) {
	const [includeX, setIncludeX] = useState(false)
	const recommended = useMemo(() => new Set(planned.map((p) => p.subjectId)), [planned])

	const completed = useMemo(
		() =>
			details
				.filter((d) => d.subjectId && d.grade)
				.map((d) => ({
					subjectId: d.subjectId as string,
					credit: d.credit ?? 0,
					grade: d.grade as string,
				})),
		[details],
	)

	const progress: ProgressResult | null = useMemo(
		() => (tree ? allocateProgress(tree.root, completed, { includeX }) : null),
		[tree, completed, includeX],
	)

	// Projection: re-run allocation as if the planned (recommended) subjects were
	// passed. The delta vs `progress` is what registering this term's plan adds.
	const projected: ProgressResult | null = useMemo(() => {
		if (!tree || planned.length === 0) return null
		const withPlan = [...completed, ...planned.map((p) => ({ ...p, grade: 'S' }))]
		return allocateProgress(tree.root, withPlan, { includeX })
	}, [tree, completed, planned, includeX])

	// Per-group projected credit-used, looked up by group id when drawing bars.
	const projectedUsed = useMemo(() => {
		const m = new Map<number, number>()
		const walk = (g: ProgressGroupResult) => {
			m.set(g.id, g.used)
			for (const c of g.children) walk(c)
		}
		if (projected) walk(projected.root)
		return m
	}, [projected])

	const courseInfo = useMemo(() => {
		const m = new Map<string, { name: string; grade: string | null }>()
		for (const d of details) {
			if (d.subjectId) m.set(d.subjectId, { name: d.nameTh ?? d.nameEn ?? '', grade: d.grade })
		}
		return m
	}, [details])

	// Every subject defined in each group (for the "subjects in this group" list),
	// and the set of subjects the student has on their transcript (checkmarked).
	const groupSubjects = useMemo(() => {
		const m = new Map<number, GroupSubjectInfo[]>()
		const walk = (g: CurriculumTree['root']) => {
			if (g.subjects.length) {
				m.set(
					g.id,
					g.subjects.map((s) => ({ id: s.id, name: s.nameTh ?? s.nameEn ?? '', credit: s.credit })),
				)
			}
			for (const c of g.children) walk(c)
		}
		if (tree) walk(tree.root)
		return m
	}, [tree])

	const takenSet = useMemo(
		() => new Set(details.map((d) => d.subjectId).filter((id): id is string => !!id)),
		[details],
	)

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
					<ProgressBar
						percent={progress.percent}
						secondaryPercent={
							projected && progress.totalRequired > 0
								? ((projected.totalUsed - progress.totalUsed) / progress.totalRequired) * 100
								: 0
						}
						tone={progress.complete ? 'green' : 'brand'}
					/>
					{projected && projected.totalUsed > progress.totalUsed && (
						<ProjectionSummary current={progress} projected={projected} />
					)}
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
					<GroupNode
						key={g.id}
						group={g}
						courseInfo={courseInfo}
						groupSubjects={groupSubjects}
						takenSet={takenSet}
						recommended={recommended}
						projectedUsed={projectedUsed}
						depth={0}
					/>
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

function ProjectionSummary({
	current,
	projected,
}: {
	current: ProgressResult
	projected: ProgressResult
}) {
	const added = projected.totalUsed - current.totalUsed
	const remaining = Math.max(0, projected.totalRequired - projected.totalUsed)
	const estSubjects = Math.ceil(remaining / 3)
	return (
		<div className="space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-xs">
			<p className="text-amber-800">
				<span className="inline-block h-2 w-2 rounded-full bg-amber-400 align-middle" />{' '}
				<span className="font-semibold">ถ้าลงตามแผนเทอมนี้</span> (+{added} นก.) →{' '}
				<span className="font-semibold">{projected.percent}%</span>
				<span className="text-amber-600"> (ตอนนี้ {current.percent}%)</span>
			</p>
			{projected.complete ? (
				<p className="text-green-700">ลงตามแผนแล้วครบทุกหมวดของหลักสูตร 🎉</p>
			) : (
				<p className="text-amber-700">
					หลังจากนั้นเหลืออีก <span className="font-semibold">{remaining} นก.</span> (≈ {estSubjects}{' '}
					วิชา) จะครบตามโครงสร้างหลักสูตร
				</p>
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
	groupSubjects,
	takenSet,
	recommended,
	projectedUsed,
	depth,
}: {
	group: ProgressGroupResult
	courseInfo: Map<string, { name: string; grade: string | null }>
	groupSubjects: Map<number, GroupSubjectInfo[]>
	takenSet: Set<string>
	recommended: Set<string>
	projectedUsed: Map<number, number>
	depth: number
}) {
	const [open, setOpen] = useState(false)
	const hasChildren = group.children.length > 0
	const defined = groupSubjects.get(group.id) ?? []
	// Subjects that counted via accept-prefix but aren't in the defined list.
	const prefixMatched = group.matched.filter((id) => !defined.some((s) => s.id === id))
	const takenCount = defined.filter((s) => takenSet.has(s.id)).length
	const showSubjects = defined.length > 0 || prefixMatched.length > 0
	const req = group.required
	const planned = Math.max(0, (projectedUsed.get(group.id) ?? group.used) - group.used)

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
					{group.used}/{req} นก.
					{planned > 0 && <span className="text-amber-600"> (+{planned})</span>}
				</span>
			</div>
			<ProgressBar
				className="mt-2"
				percent={req === 0 ? 0 : Math.min(100, (group.used / req) * 100)}
				secondaryPercent={req === 0 ? 0 : (planned / req) * 100}
				tone={group.complete ? 'green' : 'brand'}
			/>

			{!hasChildren && showSubjects && (
				<div className="mt-2">
					<button
						type="button"
						onClick={() => setOpen((o) => !o)}
						className="text-brand-700 text-xs hover:underline"
					>
						{open ? '▾' : '▸'} ดูรายวิชาในกลุ่ม
						{defined.length > 0 ? ` (${takenCount}/${defined.length})` : ''}
					</button>
					{open && (
						<ul className="mt-2 space-y-1">
							{defined.map((s) => {
								const taken = takenSet.has(s.id)
								return (
									<li key={s.id} className="flex items-center gap-2 text-xs">
										<span className={taken ? 'text-green-600' : 'text-slate-300'}>
											{taken ? '✓' : '○'}
										</span>
										<Link
											to="/subjects/$subjectId"
											params={{ subjectId: s.id }}
											className={`flex-1 truncate ${taken ? 'text-slate-700' : 'text-slate-500 hover:text-brand-700'}`}
										>
											{s.id} {s.name}
										</Link>
										<span className="shrink-0 text-slate-400">{s.credit} นก.</span>
										{!taken && recommended.has(s.id) && <Badge tone="brand">แนะนำ</Badge>}
										{taken && courseInfo.get(s.id)?.grade && (
											<span className="shrink-0 font-medium text-green-600">
												{courseInfo.get(s.id)?.grade}
											</span>
										)}
									</li>
								)
							})}
							{prefixMatched.length > 0 && (
								<li className="pt-1 text-slate-400 text-[11px]">นับเข้าหมวดนี้ (เทียบรหัส):</li>
							)}
							{prefixMatched.map((id) => (
								<li key={id} className="flex items-center gap-2 text-xs">
									<span className="text-green-600">✓</span>
									<Link
										to="/subjects/$subjectId"
										params={{ subjectId: id }}
										className="flex-1 truncate text-slate-700"
									>
										{id} {courseInfo.get(id)?.name ?? ''}
									</Link>
									{courseInfo.get(id)?.grade && (
										<span className="shrink-0 font-medium text-green-600">
											{courseInfo.get(id)?.grade}
										</span>
									)}
								</li>
							))}
						</ul>
					)}
				</div>
			)}

			{hasChildren && (
				<div className="mt-3 space-y-2">
					{group.children.map((c) => (
						<GroupNode
							key={c.id}
							group={c}
							courseInfo={courseInfo}
							groupSubjects={groupSubjects}
							takenSet={takenSet}
							recommended={recommended}
							projectedUsed={projectedUsed}
							depth={depth + 1}
						/>
					))}
				</div>
			)}
		</div>
	)
}
