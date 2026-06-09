import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import type { Detail } from '~/components/my-subjects-types'
import { db } from '~/lib/firebase'
import { createServerFn } from '~/lib/server-fn'
import { currentUid, requireUid } from './session'

type TranscriptMeta = { id: number; userId: string; createdAt: string }
const tDoc = (uid: string) => doc(db, 'users', uid, 'private', 'transcript')

/** The signed-in user's transcript with parsed + enriched course rows. */
export const getMyTranscript = createServerFn({ method: 'GET' }).handler(
	async (): Promise<{ transcript: TranscriptMeta; details: Detail[] } | null> => {
		const uid = currentUid()
		if (!uid) return null
		const snap = await getDoc(tDoc(uid))
		if (!snap.exists()) return null
		const d = snap.data()
		const ts = d.createdAt
		const createdAt =
			ts instanceof Timestamp ? ts.toDate().toISOString() : typeof ts === 'string' ? ts : ''
		return { transcript: { id: 1, userId: uid, createdAt }, details: (d.details as Detail[]) ?? [] }
	},
)

/** Upload + parse a transcript PDF; replaces any previous transcript. Rows are
 *  enriched against the catalog (nameTh/credit) at write time so reads are one
 *  doc. The PDF parser is loaded lazily (heavy) only on upload. */
export const uploadTranscript = createServerFn({ method: 'POST' })
	.inputValidator((d: FormData) => d)
	.handler(async (ctx): Promise<{ imported: number; parsed: number }> => {
		const uid = requireUid()
		const file = (ctx.data as FormData).get('file')
		if (!(file instanceof File)) throw new Error('ไม่พบไฟล์')
		const { parseTranscriptPdf } = await import('@repo/core/transcript')

		const bytes = new Uint8Array(await file.arrayBuffer())
		const rows = await parseTranscriptPdf(bytes)

		// Enrich each row with the catalog's Thai name + credit (fall back to the
		// transcript's own English name / credit for subjects not in our catalog).
		const ids = [...new Set(rows.map((r) => r.subjectId))]
		const catalog = new Map<
			string,
			{ nameTh: string | null; nameEn: string | null; credit: number | null }
		>()
		await Promise.all(
			ids.map(async (id) => {
				const s = await getDoc(doc(db, 'subjects', id))
				if (s.exists()) {
					const v = s.data()
					catalog.set(id, {
						nameTh: v.nameTh ?? null,
						nameEn: v.nameEn ?? null,
						credit: v.credit ?? null,
					})
				}
			}),
		)

		const details: Detail[] = rows
			.map((r, i) => {
				const cat = catalog.get(r.subjectId)
				return {
					id: i + 1,
					subjectId: r.subjectId,
					grade: r.grade,
					nameTh: cat?.nameTh ?? null,
					nameEn: cat?.nameEn ?? r.nameEn,
					credit: cat?.credit ?? r.credit,
					year: r.year,
					term: r.term,
				}
			})
			.sort(
				(a, b) =>
					(a.year ?? 0) - (b.year ?? 0) ||
					(a.term ?? 0) - (b.term ?? 0) ||
					(a.subjectId ?? '').localeCompare(b.subjectId ?? ''),
			)

		await setDoc(tDoc(uid), { createdAt: serverTimestamp(), details })
		return { imported: details.length, parsed: rows.length }
	})

export const deleteTranscript = createServerFn({ method: 'POST' }).handler(
	async (): Promise<{ ok: true }> => {
		await deleteDoc(tDoc(requireUid()))
		return { ok: true }
	},
)
