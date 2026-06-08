import { reviewSchema } from '@repo/core/schemas'
import { formatTerm, formatThaiDate } from '@repo/core/utils'
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
	Label,
	RatingInput,
	RatingStars,
	Select,
	Textarea,
} from '@repo/ui'
import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
	reviewEligibilityQuery,
	subjectQuery,
	subjectReviewsQuery,
	subjectSectionsQuery,
} from '~/queries'
import { deleteReview, toggleLike, upsertReview } from '~/server/reviews'

export const Route = createFileRoute('/subjects/$subjectId')({
	loader: async ({ context, params }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(subjectQuery(params.subjectId)),
			context.queryClient.ensureQueryData(subjectReviewsQuery(params.subjectId)),
			context.queryClient.ensureQueryData(subjectSectionsQuery(params.subjectId)),
		])
	},
	component: SubjectDetail,
})

// KMITL teach_day: 1 = อาทิตย์ … 7 = เสาร์.
const DAYS_TH = ['', 'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const dayTh = (d: number | null) => (d && DAYS_TH[d]) || '-'
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '')

function SubjectDetail() {
	const { subjectId } = Route.useParams()
	const { user } = Route.useRouteContext()
	const { data: subject } = useSuspenseQuery(subjectQuery(subjectId))
	const { data: reviews } = useSuspenseQuery(subjectReviewsQuery(subjectId))
	const { data: sections } = useSuspenseQuery(subjectSectionsQuery(subjectId))

	return (
		<div className="space-y-8">
			<Card>
				<CardBody className="space-y-3">
					<div className="flex items-start justify-between gap-3">
						<div>
							<h1 className="font-bold text-2xl text-slate-900">{subject.nameTh}</h1>
							<p className="mt-1 text-slate-500">{subject.nameEn}</p>
							<p className="mt-1 text-slate-500 text-sm">{subject.id}</p>
						</div>
						<Badge tone="brand">{subject.credit} หน่วยกิต</Badge>
					</div>
					<div className="flex items-center gap-2">
						<RatingStars value={subject.rating} />
						<span className="text-slate-500 text-sm">
							{subject.rating.toFixed(1)} ({subject.reviewCount} รีวิว)
						</span>
					</div>
					{subject.detail && <p className="text-slate-600 text-sm">{subject.detail}</p>}
				</CardBody>
			</Card>

			<SectionsTable sections={sections} />

			<ReviewGate subjectId={subjectId} signedIn={!!user} />

			<section className="space-y-4">
				<h2 className="font-semibold text-slate-900 text-lg">รีวิวทั้งหมด ({reviews.length})</h2>
				{reviews.length === 0 ? (
					<EmptyState title="ยังไม่มีรีวิว" description="เป็นคนแรกที่รีวิวรายวิชานี้" />
				) : (
					<div className="space-y-4">
						{reviews.map((review) => (
							<ReviewCard
								key={review.id}
								review={review}
								subjectId={subjectId}
								canDelete={!!user && review.authorId === user.id}
							/>
						))}
					</div>
				)}
			</section>
		</div>
	)
}

type SectionItem = Awaited<
	ReturnType<NonNullable<ReturnType<typeof subjectSectionsQuery>['queryFn']>>
>[number]

/** Compact "year × term offered" grid, so a student sees when this subject runs. */
function AvailabilityMatrix({ sections }: { sections: SectionItem[] }) {
	const offered = new Set(sections.map((s) => `${s.year}-${s.term}`))
	const years = [
		...new Set(sections.map((s) => s.year).filter((y): y is number => y != null)),
	].sort((a, b) => b - a)
	const terms = [1, 2, 3]
	if (!years.length) return null

	return (
		<Card>
			<CardHeader>
				<h3 className="font-medium text-slate-800 text-sm">ภาคเรียนที่เคยเปิดสอน</h3>
			</CardHeader>
			<CardBody className="overflow-x-auto p-0">
				<table className="w-full text-center text-sm">
					<thead className="border-slate-100 border-b text-slate-500 text-xs">
						<tr>
							<th className="px-4 py-2 text-left">ปีการศึกษา</th>
							{terms.map((t) => (
								<th key={t} className="px-4 py-2">
									เทอม {t}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{years.map((y) => (
							<tr key={y} className="border-slate-50 border-b last:border-0">
								<td className="px-4 py-2 text-left font-medium text-slate-700">{y}</td>
								{terms.map((t) => (
									<td key={t} className="px-4 py-2">
										{offered.has(`${y}-${t}`) ? (
											<span className="font-medium text-green-600">✓</span>
										) : (
											<span className="text-slate-200">–</span>
										)}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</CardBody>
		</Card>
	)
}

function SectionsTable({ sections }: { sections: SectionItem[] }) {
	if (!sections.length) {
		return (
			<section className="space-y-4">
				<h2 className="font-semibold text-slate-900 text-lg">ตารางสอน</h2>
				<EmptyState title="ยังไม่มีตารางสอน" description="ไม่พบ section ที่เปิดสอนของรายวิชานี้" />
			</section>
		)
	}

	const byTerm = new Map<string, SectionItem[]>()
	for (const s of sections) {
		const key = `${s.year}/${s.term}`
		const list = byTerm.get(key)
		if (list) list.push(s)
		else byTerm.set(key, [s])
	}

	return (
		<section className="space-y-4">
			<h2 className="font-semibold text-slate-900 text-lg">ตารางสอน ({sections.length} sec)</h2>
			<AvailabilityMatrix sections={sections} />
			{[...byTerm.entries()].map(([key, secs]) => {
				const head = secs[0]
				return (
					<Card key={key}>
						<CardHeader>
							<h3 className="font-medium text-slate-800">
								{head?.year && head.term ? formatTerm(head.year, head.term) : 'ภาคเรียน'}
							</h3>
						</CardHeader>
						<CardBody className="overflow-x-auto p-0">
							<table className="w-full text-left text-sm">
								<thead className="border-slate-100 border-b text-slate-500 text-xs">
									<tr>
										<th className="px-4 py-2">Sec</th>
										<th className="px-4 py-2">วัน-เวลา</th>
										<th className="px-4 py-2">ห้อง</th>
										<th className="px-4 py-2">ผู้สอน</th>
										<th className="px-4 py-2 text-right">ที่นั่ง</th>
										<th className="px-4 py-2">สถานะ</th>
									</tr>
								</thead>
								<tbody>
									{secs.map((s) => (
										<tr key={s.id} className="border-slate-50 border-b last:border-0">
											<td className="px-4 py-2 font-medium">
												{s.section}
												{s.lectOrPrac ? (
													<span className="ml-1 text-slate-500">({s.lectOrPrac})</span>
												) : null}
											</td>
											<td className="px-4 py-2 whitespace-nowrap text-slate-600">
												{dayTh(s.day)} {hhmm(s.timeStart)}
												{s.timeEnd ? `-${hhmm(s.timeEnd)}` : ''}
											</td>
											<td className="px-4 py-2 text-slate-600">{s.room ?? '-'}</td>
											<td className="px-4 py-2 text-slate-600">{s.teacherTh ?? '-'}</td>
											<td className="px-4 py-2 text-right text-slate-600">
												{s.enrolled ?? 0}
												{s.capacity ? `/${s.capacity}` : ''}
											</td>
											<td className="px-4 py-2">
												<Badge tone={s.closed ? 'red' : 'green'}>{s.closed ? 'ปิด' : 'เปิด'}</Badge>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</CardBody>
					</Card>
				)
			})}
		</section>
	)
}

/** Gate the write-review form: signed in, has a transcript, and has actually
 *  completed (passed) this subject. */
function ReviewGate({ subjectId, signedIn }: { subjectId: string; signedIn: boolean }) {
	const { data, isPending } = useQuery({
		...reviewEligibilityQuery(subjectId),
		enabled: signedIn,
	})

	if (!signedIn) return <Alert tone="info">เข้าสู่ระบบเพื่อเขียนรีวิวรายวิชานี้</Alert>
	if (isPending) return null
	if (!data?.hasTranscript) {
		return (
			<Alert tone="info">
				อัปโหลด transcript ในหน้า "วิชาของฉัน" ก่อน จึงจะเขียนรีวิวได้ (รีวิวได้เฉพาะวิชาที่เรียนผ่านแล้ว)
			</Alert>
		)
	}
	if (!data.completed) {
		return <Alert tone="info">รีวิวได้เฉพาะวิชาที่คุณเรียนผ่านแล้วเท่านั้น</Alert>
	}
	return <ReviewForm subjectId={subjectId} />
}

function ReviewForm({ subjectId }: { subjectId: string }) {
	const qc = useQueryClient()
	const [error, setError] = useState<string | null>(null)
	const currentBuddhistYear = new Date().getFullYear() + 543

	const form = useForm({
		defaultValues: {
			subjectId,
			year: currentBuddhistYear,
			term: 1,
			rating: 0,
			review: '',
		},
		validators: { onSubmit: reviewSchema },
		onSubmit: async ({ value }) => {
			setError(null)
			try {
				await upsertReview({ data: value })
				await Promise.all([
					qc.invalidateQueries({ queryKey: ['subject-reviews', subjectId] }),
					qc.invalidateQueries({ queryKey: ['subject', subjectId] }),
				])
				form.reset()
			} catch {
				setError('บันทึกรีวิวไม่สำเร็จ กรุณาลองใหม่')
			}
		},
	})

	return (
		<Card>
			<CardHeader>
				<h2 className="font-semibold text-slate-900">เขียนรีวิว</h2>
			</CardHeader>
			<CardBody>
				{error && (
					<Alert tone="error" className="mb-4">
						{error}
					</Alert>
				)}
				<form
					className="space-y-4"
					onSubmit={(e) => {
						e.preventDefault()
						form.handleSubmit()
					}}
				>
					<form.Field name="subjectId">
						{(field) => <input type="hidden" value={field.state.value} readOnly />}
					</form.Field>

					<div className="grid grid-cols-2 gap-3">
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
						<form.Field name="term">
							{(field) => (
								<Field
									label="ภาคเรียน"
									htmlFor={field.name}
									error={field.state.meta.errors[0]?.message}
								>
									<Select
										id={field.name}
										className="w-full"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(Number(e.target.value))}
									>
										<option value={1}>1</option>
										<option value={2}>2</option>
										<option value={3}>3</option>
									</Select>
								</Field>
							)}
						</form.Field>
					</div>

					<form.Field name="rating">
						{(field) => (
							<div className="space-y-1">
								<Label>คะแนน</Label>
								<RatingInput value={field.state.value} onChange={(v) => field.handleChange(v)} />
								{field.state.meta.errors[0]?.message && (
									<p className="text-red-600 text-xs">{field.state.meta.errors[0].message}</p>
								)}
							</div>
						)}
					</form.Field>

					<form.Field name="review">
						{(field) => (
							<Field label="รีวิว" htmlFor={field.name} error={field.state.meta.errors[0]?.message}>
								<Textarea
									id={field.name}
									placeholder="แบ่งปันประสบการณ์เรียนวิชานี้..."
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							</Field>
						)}
					</form.Field>

					<form.Subscribe selector={(s) => s.isSubmitting}>
						{(isSubmitting) => (
							<Button type="submit" loading={isSubmitting}>
								บันทึกรีวิว
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardBody>
		</Card>
	)
}

type ReviewItem = Awaited<
	ReturnType<NonNullable<ReturnType<typeof subjectReviewsQuery>['queryFn']>>
>[number]

function ReviewCard({
	review,
	subjectId,
	canDelete,
}: {
	review: ReviewItem
	subjectId: string
	canDelete: boolean
}) {
	const qc = useQueryClient()
	const [liked, setLiked] = useState(false)
	const [likeCount, setLikeCount] = useState(review.likeCount)
	const [pending, setPending] = useState(false)

	const onToggleLike = async () => {
		setPending(true)
		try {
			const res = await toggleLike({ data: { reviewId: review.id } })
			setLiked(res.liked)
			setLikeCount(res.likeCount)
		} catch {
			// ignore — likely not signed in
		} finally {
			setPending(false)
		}
	}

	const onDelete = async () => {
		setPending(true)
		try {
			await deleteReview({ data: review.id })
			await Promise.all([
				qc.invalidateQueries({ queryKey: ['subject-reviews', subjectId] }),
				qc.invalidateQueries({ queryKey: ['subject', subjectId] }),
			])
		} finally {
			setPending(false)
		}
	}

	return (
		<Card>
			<CardBody className="space-y-2">
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="font-medium text-slate-900">
							{review.authorNickname ?? review.authorName ?? 'ผู้ใช้'}
						</p>
						<p className="text-slate-500 text-xs">
							{review.year != null && review.term != null
								? `${formatTerm(review.year, review.term)} · `
								: ''}
							{review.createdAt ? formatThaiDate(new Date(review.createdAt)) : ''}
						</p>
					</div>
					<RatingStars value={review.rating} />
				</div>
				<p className="whitespace-pre-wrap text-slate-700 text-sm">{review.review}</p>
				<div className="flex items-center gap-3 pt-1">
					<Button variant="ghost" size="sm" loading={pending} onClick={onToggleLike}>
						{liked ? 'เลิกถูกใจ' : 'ถูกใจ'} ({likeCount})
					</Button>
					{canDelete && (
						<Button variant="danger" size="sm" loading={pending} onClick={onDelete}>
							ลบ
						</Button>
					)}
				</div>
			</CardBody>
		</Card>
	)
}
