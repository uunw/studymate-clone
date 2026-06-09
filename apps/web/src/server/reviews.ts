import { reviewSchema } from '@repo/core/schemas'
import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	query,
	serverTimestamp,
	setDoc,
	Timestamp,
	updateDoc,
	where,
} from 'firebase/firestore'
import type { Detail } from '~/components/my-subjects-types'
import { auth, db } from '~/lib/firebase'
import { createServerFn } from '~/lib/server-fn'
import { currentUid, requireUid } from './session'

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

/** Eligible to review = signed in, has a transcript, and passed this subject. */
export const getReviewEligibility = createServerFn({ method: 'GET' })
	.inputValidator((id: string) => id)
	.handler(
		async (ctx): Promise<{ signedIn: boolean; hasTranscript: boolean; completed: boolean }> => {
			const subjectId = ctx.data as string
			const uid = currentUid()
			if (!uid) return { signedIn: false, hasTranscript: false, completed: false }
			const snap = await getDoc(doc(db, 'users', uid, 'private', 'transcript'))
			if (!snap.exists()) return { signedIn: true, hasTranscript: false, completed: false }
			const details = (snap.data().details as Detail[]) ?? []
			const completed = details.some((d) => {
				const g = (d.grade ?? '').toUpperCase().trim()
				return d.subjectId === subjectId && g !== '' && !['F', 'U', 'W', 'X'].includes(g)
			})
			return { signedIn: true, hasTranscript: true, completed }
		},
	)

// Recompute the subject's rating aggregate from its reviews. There are no Cloud
// Functions, so the client writes it; firestore.rules lets a kmitl user update
// ONLY {ratingAvg, reviewCount} on a subject (trust caveat documented there).
async function recomputeSubjectAggregate(subjectId: string) {
	const snap = await getDocs(query(collection(db, 'reviews'), where('subjectId', '==', subjectId)))
	const ratings = snap.docs
		.map((d) => (d.data() as ReviewDoc).rating)
		.filter((n): n is number => typeof n === 'number')
	const reviewCount = ratings.length
	const ratingAvg = reviewCount ? ratings.reduce((a, b) => a + b, 0) / reviewCount : 0
	await updateDoc(doc(db, 'subjects', subjectId), { ratingAvg, reviewCount })
}

/** Create or replace the signed-in user's review for a (subject, year, term). */
export const upsertReview = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (ctx): Promise<{ id: number }> => {
		const uid = requireUid()
		const data = reviewSchema.parse(ctx.data)

		// One review per (user, subject, year, term): drop the old, write fresh.
		const mine = await getDocs(
			query(collection(db, 'reviews'), where('subjectId', '==', data.subjectId)),
		)
		for (const d of mine.docs) {
			const r = d.data() as ReviewDoc
			if (r.authorUid === uid && r.year === data.year && r.term === data.term)
				await deleteDoc(d.ref)
		}

		const [subjSnap, profileSnap] = await Promise.all([
			getDoc(doc(db, 'subjects', data.subjectId)),
			getDoc(doc(db, 'users', uid)),
		])
		const subjectNameTh = subjSnap.exists() ? (subjSnap.data().nameTh ?? null) : null
		const nickname = profileSnap.exists() ? (profileSnap.data().nickname ?? null) : null
		const display = auth.currentUser?.displayName ?? null

		const id = Date.now()
		await setDoc(doc(db, 'reviews', String(id)), {
			id,
			subjectId: data.subjectId,
			subjectNameTh,
			authorUid: uid,
			authorNickname: nickname ?? display,
			authorName: display,
			rating: data.rating,
			review: data.review,
			likeCount: 0,
			createdAt: serverTimestamp(),
			year: data.year,
			term: data.term,
		})
		await recomputeSubjectAggregate(data.subjectId)
		return { id }
	})

export const deleteReview = createServerFn({ method: 'POST' })
	.inputValidator((reviewId: number) => reviewId)
	.handler(async (ctx): Promise<{ ok: true }> => {
		requireUid()
		const ref = doc(db, 'reviews', String(ctx.data as number))
		const snap = await getDoc(ref)
		if (!snap.exists()) return { ok: true }
		const subjectId = (snap.data() as ReviewDoc).subjectId
		await deleteDoc(ref) // rules: only the author may delete
		await recomputeSubjectAggregate(subjectId)
		return { ok: true }
	})

/** Toggle a like for the signed-in user; returns the new like count. */
export const toggleLike = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (ctx): Promise<{ liked: boolean; likeCount: number }> => {
		const uid = requireUid()
		const reviewId = String((ctx.data as { reviewId: number }).reviewId)
		const reviewRef = doc(db, 'reviews', reviewId)
		const likeRef = doc(db, 'reviews', reviewId, 'likes', uid)

		const likeSnap = await getDoc(likeRef)
		const liking = !likeSnap.exists()
		if (liking) await setDoc(likeRef, { createdAt: serverTimestamp() })
		else await deleteDoc(likeRef)

		const likes = await getDocs(collection(db, 'reviews', reviewId, 'likes'))
		const likeCount = likes.size
		await updateDoc(reviewRef, { likeCount }) // rules: kmitl may update only likeCount
		return { liked: liking, likeCount }
	})
