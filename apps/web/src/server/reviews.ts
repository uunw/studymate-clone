import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore'
import { db } from '~/lib/firebase'
import { createServerFn } from '~/lib/server-fn'

type ReviewDoc = {
	id: number
	subjectId: string
	subjectNameTh: string | null
	authorUid: string
	authorNickname: string | null
	authorName: string | null
	rating: number
	review: string | null
	likeCount: number
	createdAt: Timestamp | string | null
	year: number | null
	term: number | null
}
const iso = (ts: ReviewDoc['createdAt']): string | null =>
	ts instanceof Timestamp ? ts.toDate().toISOString() : typeof ts === 'string' ? ts : null
const byNewest = (a: ReviewDoc, b: ReviewDoc) =>
	(iso(b.createdAt) ?? '').localeCompare(iso(a.createdAt) ?? '')

type ReviewForSubject = {
	id: number
	review: string | null
	rating: number
	likeCount: number
	createdAt: string | null
	year: number | null
	term: number | null
	authorNickname: string | null
	authorName: string | null
	authorId: string | null
}
export const listReviewsForSubject = createServerFn({ method: 'GET' })
	.inputValidator((id: string) => id)
	.handler(async (ctx): Promise<ReviewForSubject[]> => {
		const snap = await getDocs(
			query(collection(db, 'reviews'), where('subjectId', '==', ctx.data as string)),
		)
		return snap.docs
			.map((d) => d.data() as ReviewDoc)
			.sort(byNewest)
			.map((r) => ({
				id: r.id,
				review: r.review,
				rating: r.rating,
				likeCount: r.likeCount,
				createdAt: iso(r.createdAt),
				year: r.year,
				term: r.term,
				authorNickname: r.authorNickname,
				authorName: r.authorName,
				authorId: r.authorUid,
			}))
	})

type FeedReview = {
	id: number
	review: string | null
	rating: number
	likeCount: number
	createdAt: string | null
	subjectId: string | null
	subjectNameTh: string | null
	authorNickname: string | null
}
const toFeed = (r: ReviewDoc): FeedReview => ({
	id: r.id,
	review: r.review,
	rating: r.rating,
	likeCount: r.likeCount,
	createdAt: iso(r.createdAt),
	subjectId: r.subjectId,
	subjectNameTh: r.subjectNameTh,
	authorNickname: r.authorNickname,
})

export const listLatestReviews = createServerFn({ method: 'GET' })
	.inputValidator((limit?: number) => limit ?? 20)
	.handler(async (ctx): Promise<FeedReview[]> => {
		const limit = (ctx.data as number) ?? 20
		const snap = await getDocs(collection(db, 'reviews'))
		return snap.docs
			.map((d) => d.data() as ReviewDoc)
			.sort(byNewest)
			.slice(0, limit)
			.map(toFeed)
	})

export const listReviews = createServerFn({ method: 'GET' })
	.inputValidator((d: unknown) => d)
	.handler(async (ctx): Promise<FeedReview[]> => {
		const data = ctx.data as {
			search?: string
			sort?: 'latest' | 'popular' | 'rating'
			minRating?: number
			limit?: number
		}
		const snap = await getDocs(collection(db, 'reviews'))
		let rows = snap.docs.map((d) => d.data() as ReviewDoc)
		const s = data.search?.trim().toLowerCase()
		if (s) {
			rows = rows.filter(
				(r) =>
					(r.subjectNameTh ?? '').toLowerCase().includes(s) ||
					(r.subjectId ?? '').toLowerCase().includes(s),
			)
		}
		if (data.minRating) rows = rows.filter((r) => r.rating >= (data.minRating as number))
		rows.sort(
			data.sort === 'popular'
				? (a, b) => b.likeCount - a.likeCount
				: data.sort === 'rating'
					? (a, b) => b.rating - a.rating
					: byNewest,
		)
		return rows.slice(0, data.limit ?? 50).map(toFeed)
	})

// TODO(phase 4c): reviews for subjects in the signed-in user's curriculum tree.
export const listCurriculumReviews = createServerFn({ method: 'GET' }).handler(
	async (): Promise<FeedReview[]> => [],
)

// TODO(phase 4c): real eligibility (needs the user's transcript in Firestore).
export const getReviewEligibility = createServerFn({ method: 'GET' })
	.inputValidator((id: string) => id)
	.handler(
		async (): Promise<{ signedIn: boolean; hasTranscript: boolean; completed: boolean }> => ({
			signedIn: false,
			hasTranscript: false,
			completed: false,
		}),
	)

// TODO(phase 4c): writes (needs auth + a field-scoped rule for the subject
// rating aggregate / review likeCount, since there are no Cloud Functions).
export const upsertReview = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (): Promise<undefined> => undefined)

export const deleteReview = createServerFn({ method: 'POST' })
	.inputValidator((reviewId: number) => reviewId)
	.handler(async (): Promise<{ ok: true }> => ({ ok: true }))

export const toggleLike = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(
		async (): Promise<{ liked: boolean; likeCount: number }> => ({ liked: false, likeCount: 0 }),
	)
