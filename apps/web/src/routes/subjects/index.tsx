import { subjectFilterSchema } from '@repo/core/schemas'
import { Badge, Button, Card, CardBody, EmptyState, Input, RatingStars, Select } from '@repo/ui'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { curriculaQuery, curriculumGroupOptionsQuery, subjectsQuery } from '~/queries'
import type { GroupOption } from '~/server/subjects'

export const Route = createFileRoute('/subjects/')({
	validateSearch: subjectFilterSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ context, deps }) => {
		await context.queryClient.ensureQueryData(subjectsQuery(deps))
	},
	component: SubjectsBrowse,
})

// KMITL teach_day: 1 = อาทิตย์ … 7 = เสาร์.
const DAYS = [
	{ value: 0, label: 'ทุกวัน' },
	{ value: 1, label: 'อาทิตย์' },
	{ value: 2, label: 'จันทร์' },
	{ value: 3, label: 'อังคาร' },
	{ value: 4, label: 'พุธ' },
	{ value: 5, label: 'พฤหัสบดี' },
	{ value: 6, label: 'ศุกร์' },
	{ value: 7, label: 'เสาร์' },
]

const RATING_FILTERS = [
	{ value: 0, label: 'ทุกคะแนน' },
	{ value: 3, label: '3 ดาวขึ้นไป' },
	{ value: 4, label: '4 ดาวขึ้นไป' },
	{ value: 4.5, label: '4.5 ดาวขึ้นไป' },
]

function SubjectsBrowse() {
	const search = Route.useSearch()
	const navigate = Route.useNavigate()
	const { data } = useSuspenseQuery(subjectsQuery(search))
	const [q, setQ] = useState(search.q ?? '')
	const openOnly = search.openOnly === true || search.openOnly === 'true'

	const onSearch = (e: React.FormEvent) => {
		e.preventDefault()
		navigate({ search: (p) => ({ ...p, q: q.trim() || undefined, page: 1 }) })
	}

	const toggleOpen = () => {
		navigate({ search: (p) => ({ ...p, openOnly: openOnly ? undefined : true, page: 1 }) })
	}

	const goToPage = (page: number) => {
		navigate({ search: (p) => ({ ...p, page }) })
	}

	const setDay = (day: number) => {
		navigate({ search: (p) => ({ ...p, day: day || undefined, page: 1 }) })
	}
	const setMinRating = (minRating: number) => {
		navigate({ search: (p) => ({ ...p, minRating: minRating || undefined, page: 1 }) })
	}
	const setCurriculum = (curriculumId: number) => {
		navigate({
			search: (p) => ({
				...p,
				curriculumId: curriculumId || undefined,
				groupIds: undefined,
				page: 1,
			}),
		})
	}
	const setGroupIds = (groupIds: number[]) => {
		navigate({
			search: (p) => ({ ...p, groupIds: groupIds.length ? groupIds : undefined, page: 1 }),
		})
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-2xl text-slate-900">ค้นหารายวิชา</h1>
				<p className="mt-1 text-slate-600 text-sm">กรองตามชื่อวิชาหรือรหัสวิชา อ่านรีวิวจากรุ่นพี่</p>
			</div>

			<form onSubmit={onSearch} className="flex gap-2">
				<Input
					value={q}
					onChange={(e) => setQ(e.target.value)}
					placeholder="ค้นหาด้วยชื่อวิชา หรือรหัสวิชา"
					aria-label="ค้นหารายวิชา"
					inputMode="search"
				/>
				<Button type="submit">ค้นหา</Button>
			</form>

			<div className="flex flex-wrap items-center gap-3">
				<Button variant={openOnly ? 'primary' : 'secondary'} size="sm" onClick={toggleOpen}>
					{openOnly ? '✓ ' : ''}เปิดสอนเทอมนี้
				</Button>
				<Select
					aria-label="กรองตามวันที่เปิดสอน"
					value={search.day ?? 0}
					onChange={(e) => setDay(Number(e.target.value))}
				>
					{DAYS.map((d) => (
						<option key={d.value} value={d.value}>
							{d.label}
						</option>
					))}
				</Select>
				<Select
					aria-label="กรองตามคะแนนรีวิว"
					value={search.minRating ?? 0}
					onChange={(e) => setMinRating(Number(e.target.value))}
				>
					{RATING_FILTERS.map((r) => (
						<option key={r.value} value={r.value}>
							{r.label}
						</option>
					))}
				</Select>
				<span className="text-slate-500 text-sm">พบ {data.total} วิชา</span>
			</div>

			<GroupFilter
				curriculumId={search.curriculumId}
				selected={search.groupIds ?? []}
				onCurriculum={setCurriculum}
				onChange={setGroupIds}
			/>

			{data.items.length === 0 ? (
				<EmptyState title="ไม่พบรายวิชา" description="ลองเปลี่ยนคำค้นหาแล้วลองใหม่อีกครั้ง" />
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{data.items.map((subject) => (
						<Link
							key={subject.id}
							to="/subjects/$subjectId"
							params={{ subjectId: subject.id }}
							className="block transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
						>
							<Card className="h-full">
								<CardBody className="space-y-3">
									<div className="flex items-start justify-between gap-2">
										<h2 className="font-semibold text-slate-900 leading-snug">{subject.nameTh}</h2>
										<Badge tone="brand">{subject.credit} หน่วยกิต</Badge>
									</div>
									<div className="flex items-center gap-2">
										<p className="text-slate-500 text-sm">{subject.id}</p>
										{subject.openSections > 0 && (
											<Badge tone="green">เปิดสอน {subject.openSections} sec</Badge>
										)}
									</div>
									<div className="flex items-center gap-2">
										<RatingStars value={subject.rating} />
										<span className="text-slate-500 text-sm">
											{subject.rating.toFixed(1)} ({subject.reviewCount} รีวิว)
										</span>
									</div>
								</CardBody>
							</Card>
						</Link>
					))}
				</div>
			)}

			{data.totalPages > 1 && (
				<div className="flex items-center justify-center gap-4">
					<Button
						variant="secondary"
						disabled={data.page <= 1}
						onClick={() => goToPage(data.page - 1)}
					>
						ก่อนหน้า
					</Button>
					<span className="text-slate-600 text-sm">
						หน้า {data.page} / {data.totalPages}
					</span>
					<Button
						variant="secondary"
						disabled={data.page >= data.totalPages}
						onClick={() => goToPage(data.page + 1)}
					>
						ถัดไป
					</Button>
				</div>
			)}
		</div>
	)
}

/** id + all descendant ids of a group node. */
function collectIds(node: GroupOption): number[] {
	return [node.id, ...node.children.flatMap(collectIds)]
}

/** Curriculum picker + its group checkbox tree. Checking a node toggles the
 *  node and all its descendants; selected ids filter the subject list. */
function GroupFilter({
	curriculumId,
	selected,
	onCurriculum,
	onChange,
}: {
	curriculumId?: number
	selected: number[]
	onCurriculum: (id: number) => void
	onChange: (ids: number[]) => void
}) {
	const { data: curricula } = useQuery(curriculaQuery())
	const { data: groups } = useQuery({
		...curriculumGroupOptionsQuery(curriculumId ?? 0),
		enabled: !!curriculumId,
	})
	const selectedSet = new Set(selected)

	const toggle = (node: GroupOption) => {
		const ids = collectIds(node)
		const allOn = ids.every((id) => selectedSet.has(id))
		const next = new Set(selectedSet)
		for (const id of ids) {
			if (allOn) next.delete(id)
			else next.add(id)
		}
		onChange([...next])
	}

	return (
		<Card>
			<CardBody className="space-y-3">
				<div className="flex flex-wrap items-center gap-3">
					<span className="font-medium text-slate-700 text-sm">กรองตามหลักสูตร</span>
					<Select
						aria-label="กรองตามหลักสูตร"
						value={curriculumId ?? 0}
						onChange={(e) => onCurriculum(Number(e.target.value))}
					>
						<option value={0}>ทุกหลักสูตร</option>
						{(curricula ?? []).map((c) => (
							<option key={c.id} value={c.id}>
								{c.nameTh} ({c.year})
							</option>
						))}
					</Select>
					{selected.length > 0 && (
						<Button size="sm" variant="ghost" onClick={() => onChange([])}>
							ล้างกลุ่ม ({selected.length})
						</Button>
					)}
				</div>

				{curriculumId && groups && groups.length > 0 && (
					<div className="space-y-1">
						{groups.map((g) => (
							<GroupCheckbox
								key={g.id}
								node={g}
								depth={0}
								selectedSet={selectedSet}
								onToggle={toggle}
							/>
						))}
					</div>
				)}
			</CardBody>
		</Card>
	)
}

function GroupCheckbox({
	node,
	depth,
	selectedSet,
	onToggle,
}: {
	node: GroupOption
	depth: number
	selectedSet: Set<number>
	onToggle: (node: GroupOption) => void
}) {
	return (
		<div style={{ marginLeft: depth * 16 }}>
			<label className="flex items-center gap-2 py-0.5 text-slate-700 text-sm">
				<input type="checkbox" checked={selectedSet.has(node.id)} onChange={() => onToggle(node)} />
				{node.color && (
					<span className="h-2.5 w-2.5 rounded-full" style={{ background: node.color }} />
				)}
				{node.name}
			</label>
			{node.children.map((c) => (
				<GroupCheckbox
					key={c.id}
					node={c}
					depth={depth + 1}
					selectedSet={selectedSet}
					onToggle={onToggle}
				/>
			))}
		</div>
	)
}
