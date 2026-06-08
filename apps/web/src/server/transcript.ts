import { and, asc, db, desc, eq, schema } from '@repo/db'
import { createServerFn } from '@tanstack/react-start'

/** The signed-in user's latest transcript with parsed course rows. */
export const getMyTranscript = createServerFn({ method: 'GET' }).handler(async () => {
	const { requireUser } = await import('./auth.server')
	const user = await requireUser()

	const [transcript] = await db
		.select()
		.from(schema.transcript)
		.where(eq(schema.transcript.userId, user.id))
		.orderBy(desc(schema.transcript.createdAt))
		.limit(1)
	if (!transcript) return null

	const details = await db
		.select({
			id: schema.transcriptDetail.id,
			subjectId: schema.transcriptDetail.subjectId,
			grade: schema.transcriptDetail.grade,
			nameTh: schema.subject.nameTh,
			nameEn: schema.subject.nameEn,
			credit: schema.subject.credit,
			year: schema.teachtable.year,
			term: schema.teachtable.term,
		})
		.from(schema.transcriptDetail)
		.leftJoin(schema.subject, eq(schema.subject.id, schema.transcriptDetail.subjectId))
		.leftJoin(schema.teachtable, eq(schema.teachtable.id, schema.transcriptDetail.teachtableId))
		.where(eq(schema.transcriptDetail.transcriptId, transcript.id))
		.orderBy(
			asc(schema.teachtable.year),
			asc(schema.teachtable.term),
			schema.transcriptDetail.subjectId,
		)

	return { transcript, details }
})

/** Upload + parse a transcript PDF; replaces any previous transcript. */
export const uploadTranscript = createServerFn({ method: 'POST' })
	.inputValidator((data: FormData) => {
		const file = data.get('file')
		if (!(file instanceof File)) throw new Error('ไม่พบไฟล์')
		return file
	})
	.handler(async ({ data: file }) => {
		const { requireUser } = await import('./auth.server')
		const { parseTranscriptPdf } = await import('@repo/core/transcript')
		const user = await requireUser()

		const bytes = new Uint8Array(await file.arrayBuffer())
		const rows = await parseTranscriptPdf(bytes)

		// Replace prior transcript.
		await db.delete(schema.transcript).where(eq(schema.transcript.userId, user.id))
		const [transcript] = await db.insert(schema.transcript).values({ userId: user.id }).returning()

		// Ensure every parsed subject exists (insert stubs for ones not in our
		// catalog, from the transcript's English name + credit; don't overwrite).
		const subjValues = [...new Map(rows.map((r) => [r.subjectId, r])).values()].map((r) => ({
			id: r.subjectId,
			nameEn: r.nameEn,
			credit: r.credit,
		}))
		if (subjValues.length) {
			await db.insert(schema.subject).values(subjValues).onConflictDoNothing()
		}

		let imported = 0
		for (const r of rows) {
			let teachtableId: number | null = null
			if (r.year && r.term) {
				const [tt] = await db
					.select()
					.from(schema.teachtable)
					.where(and(eq(schema.teachtable.year, r.year), eq(schema.teachtable.term, r.term)))
					.limit(1)
				teachtableId =
					tt?.id ??
					(
						await db.insert(schema.teachtable).values({ year: r.year, term: r.term }).returning()
					)[0]!.id
			}

			await db.insert(schema.transcriptDetail).values({
				transcriptId: transcript!.id,
				subjectId: r.subjectId,
				teachtableId,
				grade: r.grade,
			})
			imported++
		}

		return { imported, parsed: rows.length }
	})

export const deleteTranscript = createServerFn({ method: 'POST' }).handler(async () => {
	const { requireUser } = await import('./auth.server')
	const user = await requireUser()
	await db.delete(schema.transcript).where(eq(schema.transcript.userId, user.id))
	return { ok: true }
})
