import { and, db, eq, inArray, schema } from '@repo/db'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export type AdminGroupSubject = {
	id: string
	nameTh: string | null
	nameEn: string | null
	credit: number | null
}
export type AdminGroupNode = {
	id: number
	parentId: number | null
	type: string | null
	name: string | null
	credit: number | null
	color: string | null
	acceptPrefix: string | null
	subjects: AdminGroupSubject[]
	children: AdminGroupNode[]
}
export type AdminCurriculumTree = {
	curriculum: { id: number; nameTh: string | null; nameEn: string | null }
	root: AdminGroupNode | null
}

export const GROUP_TYPES = [
	'COLLECTIVE',
	'REQUIRED_ALL',
	'REQUIRED_CREDIT',
	'REQUIRED_BRANCH',
	'FREE',
] as const

/** The full curriculum-group tree (with each group's subjects) for admin editing. */
export const getCurriculumGroupTree = createServerFn({ method: 'GET' })
	.inputValidator((curriculumId: number) => curriculumId)
	.handler(async ({ data: curriculumId }): Promise<AdminCurriculumTree | null> => {
		const { requireAdmin } = await import('./auth.server')
		await requireAdmin()

		const [curriculum] = await db
			.select()
			.from(schema.curriculum)
			.where(eq(schema.curriculum.id, curriculumId))
			.limit(1)
		if (!curriculum) return null

		const curriculumInfo = {
			id: curriculum.id,
			nameTh: curriculum.nameTh,
			nameEn: curriculum.nameEn,
		}
		if (!curriculum.groupId) return { curriculum: curriculumInfo, root: null }

		const rows: (typeof schema.curriculumGroup.$inferSelect)[] = []
		const [rootRow] = await db
			.select()
			.from(schema.curriculumGroup)
			.where(eq(schema.curriculumGroup.id, curriculum.groupId))
			.limit(1)
		if (!rootRow) return { curriculum: curriculumInfo, root: null }
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

		const ids = rows.map((r) => r.id)
		const links = ids.length
			? await db
					.select({
						groupId: schema.curriculumGroupSubject.groupId,
						id: schema.subject.id,
						nameTh: schema.subject.nameTh,
						nameEn: schema.subject.nameEn,
						credit: schema.subject.credit,
					})
					.from(schema.curriculumGroupSubject)
					.innerJoin(schema.subject, eq(schema.subject.id, schema.curriculumGroupSubject.subjectId))
					.where(inArray(schema.curriculumGroupSubject.groupId, ids))
			: []

		const subjectsByGroup = new Map<number, AdminGroupSubject[]>()
		for (const l of links) {
			const list = subjectsByGroup.get(l.groupId) ?? []
			list.push({ id: l.id, nameTh: l.nameTh, nameEn: l.nameEn, credit: l.credit })
			subjectsByGroup.set(l.groupId, list)
		}
		const childrenByParent = new Map<number, typeof rows>()
		for (const r of rows) {
			if (r.parentId == null) continue
			const list = childrenByParent.get(r.parentId) ?? []
			list.push(r)
			childrenByParent.set(r.parentId, list)
		}
		for (const list of childrenByParent.values()) list.sort((a, b) => a.id - b.id)

		const build = (r: (typeof rows)[number]): AdminGroupNode => ({
			id: r.id,
			parentId: r.parentId,
			type: r.type,
			name: r.name,
			credit: r.credit,
			color: r.color,
			acceptPrefix: r.acceptPrefix,
			subjects: (subjectsByGroup.get(r.id) ?? []).sort((a, b) => a.id.localeCompare(b.id)),
			children: (childrenByParent.get(r.id) ?? []).map(build),
		})

		return { curriculum: curriculumInfo, root: build(rootRow) }
	})

const groupInput = z.object({
	type: z.enum(GROUP_TYPES),
	name: z.string().min(1, 'กรุณากรอกชื่อกลุ่ม'),
	credit: z.number().int().min(0).nullable(),
	color: z.string().max(32).nullable(),
	acceptPrefix: z.string().max(16).nullable(),
})

export const createCurriculumGroup = createServerFn({ method: 'POST' })
	.inputValidator(groupInput.extend({ parentId: z.number().int() }))
	.handler(async ({ data }) => {
		const { requireAdmin } = await import('./auth.server')
		await requireAdmin()
		const [row] = await db
			.insert(schema.curriculumGroup)
			.values({
				parentId: data.parentId,
				type: data.type,
				name: data.name,
				credit: data.credit,
				color: data.color,
				acceptPrefix: data.acceptPrefix,
			})
			.returning()
		return { id: row!.id }
	})

export const updateCurriculumGroup = createServerFn({ method: 'POST' })
	.inputValidator(groupInput.extend({ id: z.number().int() }))
	.handler(async ({ data }) => {
		const { requireAdmin } = await import('./auth.server')
		await requireAdmin()
		await db
			.update(schema.curriculumGroup)
			.set({
				type: data.type,
				name: data.name,
				credit: data.credit,
				color: data.color,
				acceptPrefix: data.acceptPrefix,
			})
			.where(eq(schema.curriculumGroup.id, data.id))
		return { id: data.id }
	})

/** Delete a group and its whole subtree (parentId has no DB cascade). */
export const deleteCurriculumGroup = createServerFn({ method: 'POST' })
	.inputValidator((id: number) => id)
	.handler(async ({ data: id }) => {
		const { requireAdmin } = await import('./auth.server')
		await requireAdmin()
		const toDelete = [id]
		let frontier = [id]
		while (frontier.length) {
			const children = await db
				.select({ id: schema.curriculumGroup.id })
				.from(schema.curriculumGroup)
				.where(inArray(schema.curriculumGroup.parentId, frontier))
			if (!children.length) break
			const ids = children.map((c) => c.id)
			toDelete.push(...ids)
			frontier = ids
		}
		// curriculum_group_subject cascades on group delete; child groups removed explicitly.
		await db.delete(schema.curriculumGroup).where(inArray(schema.curriculumGroup.id, toDelete))
		return { ok: true, deleted: toDelete.length }
	})

/** Link subjects (whitespace/comma-separated 8-digit codes) to a group. Only
 *  subjects already in the catalog are linked; unknown codes are reported. */
export const assignSubjectsToGroup = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ groupId: z.number().int(), codes: z.string() }))
	.handler(async ({ data }) => {
		const { requireAdmin } = await import('./auth.server')
		await requireAdmin()

		const codes = [
			...new Set(
				data.codes
					.split(/[\s,]+/)
					.map((c) => c.trim())
					.filter((c) => /^\d{8}$/.test(c)),
			),
		]
		if (!codes.length) return { added: 0, skipped: [] as string[] }

		const known = await db
			.select({ id: schema.subject.id })
			.from(schema.subject)
			.where(inArray(schema.subject.id, codes))
		const knownIds = new Set(known.map((k) => k.id))
		const skipped = codes.filter((c) => !knownIds.has(c))

		const existing = await db
			.select({ subjectId: schema.curriculumGroupSubject.subjectId })
			.from(schema.curriculumGroupSubject)
			.where(eq(schema.curriculumGroupSubject.groupId, data.groupId))
		const linked = new Set(existing.map((e) => e.subjectId))

		const toAdd = codes.filter((c) => knownIds.has(c) && !linked.has(c))
		if (toAdd.length) {
			await db
				.insert(schema.curriculumGroupSubject)
				.values(toAdd.map((subjectId) => ({ groupId: data.groupId, subjectId })))
		}
		return { added: toAdd.length, skipped }
	})

export const removeSubjectFromGroup = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ groupId: z.number().int(), subjectId: z.string() }))
	.handler(async ({ data }) => {
		const { requireAdmin } = await import('./auth.server')
		await requireAdmin()
		await db
			.delete(schema.curriculumGroupSubject)
			.where(
				and(
					eq(schema.curriculumGroupSubject.groupId, data.groupId),
					eq(schema.curriculumGroupSubject.subjectId, data.subjectId),
				),
			)
		return { ok: true }
	})
