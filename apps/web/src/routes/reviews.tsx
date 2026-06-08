import { formatThaiDate } from '@repo/core/utils'
import {
	Badge,
	Button,
	Card,
	CardBody,
	EmptyState,
	Input,
	RatingStars,
	Select,
	Spinner,
	Tabs,
} from '@repo/ui'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { curriculumReviewsQuery, reviewsFeedQuery } from '~/queries'

export const Route = createFileRoute('/reviews')({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(reviewsFeedQuery({ sort: 'latest' }))
	},
	component: Reviews,
})

const TABS = [
	{ value: 'all', label: 'รีวิวทั้งหมด' },
	{ value: 'curriculum', label: 'หลักสูตรของฉัน' },
] as const

const SORTS = [
	{ value: 'latest', label: 'ล่าสุด' },
	{ value: 'popular', label: 'ยอดนิยม' },
	{ value: 'rating', label: 'คะแนนสูงสุด' },
] as const

const RATINGS = [
	{ value: 0, label: 'ทุกคะแนน' },
	{ value: 3, label: '3 ดาวขึ้นไป' },
	{ value: 4, label: '4 ดาวขึ้นไป' },
	{ value: 4.5, label: '4.5 ดาวขึ้นไป' },
]

type FeedItem = {
	id: number
	review: string | null
	rating: number
	likeCount: number
	createdAt: string | null
	subjectId: string | null
	subjectNameTh: string | null
	authorNickname: string | null
}

function Reviews() {
	const { user } = Route.useRouteContext()
	const [tab, setTab] = useState<string>('all')
	const [searchInput, setSearchInput] = useState('')
	const [search, setSearch] = useState('')
	const [sort, setSort] = useState<'latest' | 'popular' | 'rating'>('latest')
	const [minRating, setMinRating] = useState(0)

	const allQ = useQuery(
		reviewsFeedQuery({ search: search || undefined, sort, minRating: minRating || undefined }),
	)
	const curQ = useQuery({ ...curriculumReviewsQuery(), enabled: tab === 'curriculum' && !!user })

	const reviews = (tab === 'all' ? allQ.data : curQ.data) as FeedItem[] | undefined
	const loading = tab === 'all' ? allQ.isPending : curQ.isPending

	return (
		<div className="space-y-6">
			<header>
				<h1 className="font-bold text-2xl text-slate-900 tracking-tight">รีวิวรายวิชา</h1>
				<p className="mt-1 text-slate-600 text-sm">อ่านรีวิวจากรุ่นพี่ ค้นหาและกรองตามคะแนน</p>
			</header>

			<Tabs tabs={TABS} value={tab} onChange={setTab} />

			{tab === 'all' && (
				<div className="flex flex-wrap items-center gap-2">
					<form
						className="flex flex-1 gap-2"
						onSubmit={(e) => {
							e.preventDefault()
							setSearch(searchInput.trim())
						}}
					>
						<Input
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							placeholder="ค้นหาด้วยชื่อวิชา หรือรหัสวิชา"
							aria-label="ค้นหารีวิว"
							inputMode="search"
						/>
						<Button type="submit" size="sm">
							ค้นหา
						</Button>
					</form>
					<Select
						aria-label="เรียงลำดับรีวิว"
						value={sort}
						onChange={(e) => setSort(e.target.value as typeof sort)}
					>
						{SORTS.map((s) => (
							<option key={s.value} value={s.value}>
								{s.label}
							</option>
						))}
					</Select>
					<Select
						aria-label="กรองตามคะแนน"
						value={minRating}
						onChange={(e) => setMinRating(Number(e.target.value))}
					>
						{RATINGS.map((r) => (
							<option key={r.value} value={r.value}>
								{r.label}
							</option>
						))}
					</Select>
				</div>
			)}

			{tab === 'curriculum' && !user ? (
				<Card>
					<CardBody>
						<EmptyState
							title="กรุณาเข้าสู่ระบบ"
							description="เข้าสู่ระบบและเลือกหลักสูตรเพื่อดูรีวิวเฉพาะหลักสูตรของคุณ"
						/>
						<Link
							to="/sign-in"
							className="mt-2 inline-block text-brand-700 text-sm hover:underline"
						>
							เข้าสู่ระบบ →
						</Link>
					</CardBody>
				</Card>
			) : loading ? (
				<div className="flex justify-center py-10">
					<Spinner />
				</div>
			) : !reviews || reviews.length === 0 ? (
				<EmptyState
					title="ยังไม่มีรีวิว"
					description={tab === 'curriculum' ? 'ยังไม่มีรีวิวในหลักสูตรของคุณ' : 'ลองเปลี่ยนคำค้นหาหรือตัวกรอง'}
				/>
			) : (
				<div className="space-y-4">
					{reviews.map((r) => (
						<ReviewCard key={r.id} review={r} />
					))}
				</div>
			)}
		</div>
	)
}

function ReviewCard({ review: r }: { review: FeedItem }) {
	return (
		<Card>
			<CardBody className="space-y-3">
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div>
						<Link
							to="/subjects/$subjectId"
							params={{ subjectId: r.subjectId ?? '' }}
							className="font-semibold text-brand-700 hover:underline"
						>
							{r.subjectNameTh}
						</Link>
						<Badge tone="slate" className="ml-2">
							{r.subjectId}
						</Badge>
					</div>
					<RatingStars value={r.rating} />
				</div>

				<p className="whitespace-pre-line text-slate-700 text-sm">{r.review}</p>

				<div className="flex flex-wrap items-center gap-3 text-slate-500 text-xs">
					<span>โดย {r.authorNickname}</span>
					<span>·</span>
					<span>{r.createdAt ? formatThaiDate(new Date(r.createdAt)) : ''}</span>
					<span>·</span>
					<span>ถูกใจ {r.likeCount}</span>
				</div>
			</CardBody>
		</Card>
	)
}
