import { formatThaiDate } from '@repo/core/utils'
import { Badge, Card, CardBody, EmptyState, RatingStars } from '@repo/ui'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { latestReviewsQuery } from '~/queries'

export const Route = createFileRoute('/reviews')({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(latestReviewsQuery(30))
	},
	component: Reviews,
})

function Reviews() {
	const { data } = useSuspenseQuery(latestReviewsQuery(30))

	return (
		<div className="space-y-6">
			<header>
				<h1 className="font-bold text-2xl text-slate-900 tracking-tight">รีวิวล่าสุด</h1>
				<p className="mt-1 text-slate-600 text-sm">รีวิวใหม่ล่าสุดจากทุกรายวิชา</p>
			</header>

			{data.length === 0 ? (
				<EmptyState title="ยังไม่มีรีวิว" description="ยังไม่มีรีวิวในระบบ ลองกลับมาดูใหม่ภายหลัง" />
			) : (
				<div className="space-y-4">
					{data.map((r) => (
						<Card key={r.id}>
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

								<div className="flex flex-wrap items-center gap-3 text-slate-400 text-xs">
									<span>โดย {r.authorNickname}</span>
									<span>·</span>
									<span>{r.createdAt ? formatThaiDate(new Date(r.createdAt)) : ''}</span>
									<span>·</span>
									<span>ถูกใจ {r.likeCount}</span>
								</div>
							</CardBody>
						</Card>
					))}
				</div>
			)}
		</div>
	)
}
