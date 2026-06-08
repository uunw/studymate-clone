import {
	allocateProgress,
	type ProgressGroupResult,
	type ProgressResult,
} from '@repo/core/progress'
import { Badge, Button, Card, CardBody, EmptyState, ProgressBar } from '@repo/ui'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import type { Detail } from '~/components/my-subjects-types'
import {
	myCurriculumTreeQuery,
	myTranscriptQuery,
	registrationPlanQuery,
	subjectsQuery,
} from '~/queries'
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

	// Free-elective subjects picked from the catalog (เลือกเสรี has no predefined
	// list — the student picks any subject). id → name/credit, for display + credit.
	const [freePicks, setFreePicks] = useState<Map<string, { name: string; credit: number }>>(
		new Map(),
	)

	// Credit lookup for any selectable subject (defined-in-group + plan + free picks).
	const creditOf = useMemo(() => {
		const m = new Map<string, number>()
		for (const list of groupSubjects.values()) for (const s of list) m.set(s.id, s.credit)
		for (const p of planned) m.set(p.subjectId, p.credit)
		for (const [id, info] of freePicks) m.set(id, info.credit)
		return m
	}, [groupSubjects, planned, freePicks])

	// What-if simulation set: defaults to the registrar plan; the user can tick
	// subjects, auto-fill to complete, reset, or clear. `dirty` stops the
	// default-to-plan effect once the user has touched it.
	const [simulated, setSimulated] = useState<Set<string>>(new Set())
	const [dirty, setDirty] = useState(false)
	useEffect(() => {
		if (!dirty) setSimulated(new Set(recommended))
	}, [recommended, dirty])

	const toggleSim = (id: string) => {
		setDirty(true)
		setSimulated((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}
	const resetToPlan = () => {
		setDirty(false)
		setSimulated(new Set(recommended))
		setFreePicks(new Map())
	}
	const clearSim = () => {
		setDirty(true)
		setSimulated(new Set())
		setFreePicks(new Map())
	}
	const pickFree = (s: { id: string; name: string; credit: number }) => {
		setDirty(true)
		setFreePicks((prev) => new Map(prev).set(s.id, { name: s.name, credit: s.credit }))
		setSimulated((prev) => new Set(prev).add(s.id))
	}
	const removeFree = (id: string) => {
		setFreePicks((prev) => {
			const next = new Map(prev)
			next.delete(id)
			return next
		})
		setSimulated((prev) => {
			const next = new Set(prev)
			next.delete(id)
			return next
		})
	}

	const simulatedCredit = useMemo(
		() => [...simulated].reduce((s, id) => s + (creditOf.get(id) ?? 0), 0),
		[simulated, creditOf],
	)

	const projected: ProgressResult | null = useMemo(() => {
		if (!tree || simulated.size === 0) return null
		const sim = [...simulated].map((id) => ({
			subjectId: id,
			credit: creditOf.get(id) ?? 0,
			grade: 'S',
		}))
		return allocateProgress(tree.root, [...completed, ...sim], { includeX })
	}, [tree, completed, simulated, creditOf, includeX])

	const projectedUsed = useMemo(() => {
		const m = new Map<number, number>()
		const walk = (g: ProgressGroupResult) => {
			m.set(g.id, g.used)
			for (const c of g.children) walk(c)
		}
		if (projected) walk(projected.root)
		return m
	}, [projected])

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

					{!progress.complete && (
						<p className="text-slate-500 text-xs">
							🎓 เรียนให้ครบหลักสูตรต้องอีก{' '}
							<span className="font-semibold text-slate-700">{progress.remaining} นก.</span> (≈{' '}
							{Math.ceil(progress.remaining / 18)} เทอม) — ติ๊กวิชาด้านล่างเพื่อจำลองว่าจะลงตัวไหน
						</p>
					)}

					<div className="space-y-2">
						<div className="flex flex-wrap items-center gap-2 text-xs">
							<span className="text-slate-500">จำลองการลงทะเบียน:</span>
							<Button size="sm" variant="ghost" onClick={resetToPlan}>
								แผนเทอมนี้
							</Button>
							{simulated.size > 0 && (
								<Button size="sm" variant="ghost" onClick={clearSim}>
									ล้าง
								</Button>
							)}
							{simulated.size > 0 && (
								<span className="font-medium text-amber-700">
									จำลอง {simulated.size} วิชา · +{simulatedCredit} นก.
								</span>
							)}
						</div>
						{simulatedCredit > 27 && (
							<p className="text-amber-700 text-xs">⚠ ลงเกินเพดาน ~27 นก./เทอม — ควรแบ่งหลายเทอม</p>
						)}
					</div>

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
						simulated={simulated}
						onToggle={toggleSim}
						freePicks={freePicks}
						onPickFree={pickFree}
						onRemoveFree={removeFree}
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
	const estTerms = Math.ceil(remaining / 18) // ~18 credits/term typical full load
	const estSubjects = Math.ceil(remaining / 3) // ~3 credits/subject typical
	return (
		<div className="space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-xs">
			<p className="text-amber-800">
				<span className="inline-block h-2 w-2 rounded-full bg-amber-400 align-middle" />{' '}
				<span className="font-semibold">ถ้าลงตามที่เลือก</span> (+{added} นก.) →{' '}
				<span className="font-semibold">{projected.percent}%</span>
				<span className="text-amber-600"> (ตอนนี้ {current.percent}%)</span>
			</p>
			{projected.complete ? (
				<p className="font-medium text-green-700">
					ครบทุกหมวดของหลักสูตรแล้ว 🎉 (ลงเพิ่มอีก {added} นก. · ~{Math.ceil(added / 18)} เทอม)
				</p>
			) : (
				<p className="text-amber-700">
					หลังจากนั้นเหลืออีก <span className="font-semibold">{remaining} นก.</span> (≈ {estSubjects} วิชา
					/ ~{estTerms} เทอม) จะครบตามโครงสร้างหลักสูตร
				</p>
			)}
		</div>
	)
}

/** Catalog search to pick free-elective subjects (เลือกเสรี has no fixed list). */
function FreeElectivePicker({
	picks,
	takenSet,
	onPick,
	onRemove,
}: {
	picks: Map<string, { name: string; credit: number }>
	takenSet: Set<string>
	onPick: (s: { id: string; name: string; credit: number }) => void
	onRemove: (id: string) => void
}) {
	const [q, setQ] = useState('')
	const [applied, setApplied] = useState('')
	const { data } = useQuery({
		...subjectsQuery({ q: applied, page: 1, pageSize: 8 }),
		enabled: applied.length >= 2,
	})

	return (
		<div className="mt-2 space-y-2">
			{picks.size > 0 && (
				<ul className="space-y-1">
					{[...picks.entries()].map(([id, info]) => (
						<li key={id} className="flex items-center gap-2 text-xs">
							<span className="text-amber-500">＋</span>
							<Link
								to="/subjects/$subjectId"
								params={{ subjectId: id }}
								className="flex-1 truncate text-slate-700"
							>
								{id} {info.name}
							</Link>
							<span className="shrink-0 text-slate-400">{info.credit} นก.</span>
							<button
								type="button"
								onClick={() => onRemove(id)}
								className="shrink-0 text-red-500 hover:underline"
							>
								ลบ
							</button>
						</li>
					))}
				</ul>
			)}
			<form
				className="flex gap-2"
				onSubmit={(e) => {
					e.preventDefault()
					setApplied(q.trim())
				}}
			>
				<input
					value={q}
					onChange={(e) => setQ(e.target.value)}
					placeholder="ค้นหาวิชาเลือกเสรี (ชื่อ/รหัส)…"
					className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs"
				/>
				<button
					type="submit"
					className="shrink-0 rounded-md bg-brand-50 px-3 py-1 font-medium text-brand-700 text-xs hover:bg-brand-100"
				>
					ค้นหา
				</button>
			</form>
			{applied.length >= 2 && data && (
				<ul className="space-y-1">
					{data.items.length === 0 ? (
						<li className="text-slate-400 text-xs">ไม่พบวิชา</li>
					) : (
						data.items.map((s) => {
							const picked = picks.has(s.id)
							const taken = takenSet.has(s.id)
							return (
								<li key={s.id} className="flex items-center gap-2 text-xs">
									<span className="flex-1 truncate text-slate-600">
										{s.id} {s.nameTh ?? s.nameEn}
									</span>
									<span className="shrink-0 text-slate-400">{s.credit ?? '-'} นก.</span>
									{taken ? (
										<span className="shrink-0 text-green-600 text-[11px]">เรียนแล้ว</span>
									) : picked ? (
										<span className="shrink-0 text-amber-600 text-[11px]">เลือกแล้ว</span>
									) : (
										<button
											type="button"
											onClick={() =>
												onPick({
													id: s.id,
													name: s.nameTh ?? s.nameEn ?? s.id,
													credit: s.credit ?? 0,
												})
											}
											className="shrink-0 text-brand-700 hover:underline"
										>
											+ เพิ่ม
										</button>
									)}
								</li>
							)
						})
					)}
				</ul>
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
	simulated,
	onToggle,
	freePicks,
	onPickFree,
	onRemoveFree,
	projectedUsed,
	depth,
}: {
	group: ProgressGroupResult
	courseInfo: Map<string, { name: string; grade: string | null }>
	groupSubjects: Map<number, GroupSubjectInfo[]>
	takenSet: Set<string>
	recommended: Set<string>
	simulated: Set<string>
	onToggle: (id: string) => void
	freePicks: Map<string, { name: string; credit: number }>
	onPickFree: (s: { id: string; name: string; credit: number }) => void
	onRemoveFree: (id: string) => void
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
	const isFree = group.type === 'FREE'
	const req = group.required
	const projUsed = projectedUsed.get(group.id) ?? group.used
	const planned = Math.max(0, projUsed - group.used)
	// Group completes only thanks to the simulation (D).
	const completeIfPlanned = !group.complete && req > 0 && projUsed >= req

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
					{completeIfPlanned && <Badge tone="amber">ครบถ้าลงตามแผน</Badge>}
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

			{isFree && (
				<FreeElectivePicker
					picks={freePicks}
					takenSet={takenSet}
					onPick={onPickFree}
					onRemove={onRemoveFree}
				/>
			)}

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
										<input
											type="checkbox"
											checked={taken || simulated.has(s.id)}
											disabled={taken}
											onChange={() => onToggle(s.id)}
											title={taken ? 'เรียนแล้ว' : 'จำลองว่าลงวิชานี้'}
											className="accent-amber-500"
										/>
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
							simulated={simulated}
							onToggle={onToggle}
							freePicks={freePicks}
							onPickFree={onPickFree}
							onRemoveFree={onRemoveFree}
							projectedUsed={projectedUsed}
							depth={depth + 1}
						/>
					))}
				</div>
			)}
		</div>
	)
}
