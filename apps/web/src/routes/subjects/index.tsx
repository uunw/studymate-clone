import { subjectFilterSchema } from '@repo/core/schemas'
import { Badge, Button, Card, CardBody, EmptyState, Input, RatingStars } from '@repo/ui'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { subjectsQuery } from '~/queries'

export const Route = createFileRoute('/subjects/')({
	validateSearch: subjectFilterSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ context, deps }) => {
		await context.queryClient.ensureQueryData(subjectsQuery(deps))
	},
	component: SubjectsBrowse,
})

const DAYS = [
	{ value: 0, label: 'ทุกวัน' },
	{ value: 1, label: 'จันทร์' },
	{ value: 2, label: 'อังคาร' },
	{ value: 3, label: 'พุธ' },
	{ value: 4, label: 'พฤหัสบดี' },
	{ value: 5, label: 'ศุกร์' },
	{ value: 6, label: 'เสาร์' },
	{ value: 7, label: 'อาทิตย์' },
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
					inputMode="search"
				/>
				<Button type="submit">ค้นหา</Button>
			</form>

			<div className="flex flex-wrap items-center gap-3">
				<Button variant={openOnly ? 'primary' : 'secondary'} size="sm" onClick={toggleOpen}>
					{openOnly ? '✓ ' : ''}เปิดสอนเทอมนี้
				</Button>
				<select
					value={search.day ?? 0}
					onChange={(e) => setDay(Number(e.target.value))}
					className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 text-sm shadow-sm"
				>
					{DAYS.map((d) => (
						<option key={d.value} value={d.value}>
							{d.label}
						</option>
					))}
				</select>
				<select
					value={search.minRating ?? 0}
					onChange={(e) => setMinRating(Number(e.target.value))}
					className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-900 text-sm shadow-sm"
				>
					{RATING_FILTERS.map((r) => (
						<option key={r.value} value={r.value}>
							{r.label}
						</option>
					))}
				</select>
				<span className="text-slate-500 text-sm">พบ {data.total} วิชา</span>
			</div>

			{data.items.length === 0 ? (
				<EmptyState title="ไม่พบรายวิชา" description="ลองเปลี่ยนคำค้นหาแล้วลองใหม่อีกครั้ง" />
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{data.items.map((subject) => (
						<Link
							key={subject.id}
							to="/subjects/$subjectId"
							params={{ subjectId: subject.id }}
							className="block transition-transform hover:-translate-y-0.5"
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
