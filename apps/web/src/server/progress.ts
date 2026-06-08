import type { ProgressGroupInput } from '@repo/core/progress'
import { db, eq, inArray, schema } from '@repo/db'
import { createServerFn } from '@tanstack/react-start'

export type CurriculumTree = {
	curriculum: { id: number; nameTh: string | null; nameEn: string | null; year: number | null }
	root: ProgressGroupInput
}

/**
 * The signed-in user's curriculum group tree (with each group's subjects + their
 * credits), shaped for the pure `allocateProgress` algorithm. Returns null when
 * the user has no curriculum or it has no group tree. The transcript is fetched
 * separately (getMyTranscript) and matched against this tree on the client, so
 * the grade-tracker "what-if" recompute stays local.
 */
export const getMyCurriculumTree = createServerFn({ method: 'GET' }).handler(
	async (): Promise<CurriculumTree | null> => {
		const { requireUser } = await import('./auth.server')
		const user = await requireUser()
		if (!user.curriculumId) return null

		const [curriculum] = await db
			.select()
			.from(schema.curriculum)
			.where(eq(schema.curriculum.id, user.curriculumId))
			.limit(1)
		if (!curriculum?.groupId) return null

		// Walk the tree from the curriculum's root group down via parentId.
		const rows: (typeof schema.curriculumGroup.$inferSelect)[] = []
		const [rootRow] = await db
			.select()
			.from(schema.curriculumGroup)
			.where(eq(schema.curriculumGroup.id, curriculum.groupId))
			.limit(1)
		if (!rootRow) return null
		rows.push(rootRow)

		let frontier = [rootRow.id]
		while (frontier.length) {
			const children = await db
				.select()
				.from(schema.curriculumGroup)
				.where(inArray(schema.curriculumGroup.parentId, frontier))
			if (!children.length) break
			rows.push(...children)
			frontier = children.map((c) => c.id)
		}

		// Subjects per group, with credit from the catalog.
		const ids = rows.map((r) => r.id)
		const links = ids.length
			? await db
					.select({
						groupId: schema.curriculumGroupSubject.groupId,
						subjectId: schema.curriculumGroupSubject.subjectId,
						credit: schema.subject.credit,
						nameTh: schema.subject.nameTh,
						nameEn: schema.subject.nameEn,
					})
					.from(schema.curriculumGroupSubject)
					.leftJoin(schema.subject, eq(schema.subject.id, schema.curriculumGroupSubject.subjectId))
					.where(inArray(schema.curriculumGroupSubject.groupId, ids))
			: []

		const subjectsByGroup = new Map<
			number,
			{ id: string; credit: number; nameTh: string | null; nameEn: string | null }[]
		>()
		for (const l of links) {
			const list = subjectsByGroup.get(l.groupId) ?? []
			list.push({ id: l.subjectId, credit: l.credit ?? 0, nameTh: l.nameTh, nameEn: l.nameEn })
			subjectsByGroup.set(l.groupId, list)
		}
		const childrenByParent = new Map<number, typeof rows>()
		for (const r of rows) {
			if (r.parentId == null) continue
			const list = childrenByParent.get(r.parentId) ?? []
			list.push(r)
			childrenByParent.set(r.parentId, list)
		}
		// Keep children in curriculum (creation) order so depth-first placement
		// visits specific groups before catch-all FREE groups, which were seeded
		// last — otherwise a FREE bucket could claim a subject from its real group.
		for (const list of childrenByParent.values()) list.sort((a, b) => a.id - b.id)

		const build = (r: (typeof rows)[number]): ProgressGroupInput => ({
			id: r.id,
			name: r.name ?? '',
			type: r.type,
			credit: r.credit,
			color: r.color,
			acceptPrefix: r.acceptPrefix,
			subjects: subjectsByGroup.get(r.id) ?? [],
			children: (childrenByParent.get(r.id) ?? []).map(build),
		})

		return {
			curriculum: {
				id: curriculum.id,
				nameTh: curriculum.nameTh,
				nameEn: curriculum.nameEn,
				year: curriculum.year,
			},
			root: build(rootRow),
		}
	},
)
