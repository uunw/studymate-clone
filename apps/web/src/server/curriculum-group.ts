import type { Curriculum } from '@repo/db'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '~/lib/firebase'
import { createServerFn } from '~/lib/server-fn'

// Denormalized node shape (curricula/{id}.tree), as written by seed-firestore.
type StoredTreeNode = {
	id: number
	name: string
	type: string | null
	credit: number | null
	color: string | null
	acceptPrefix: string | null
	subjects: { id: string; credit: number; nameTh: string | null; nameEn: string | null }[]
	children: StoredTreeNode[]
}

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

// Reads curricula/{id}.tree and re-shapes it for the admin editor (deriving each
// node's parentId from the walk). TODO(phase 4c): admin writes need the
// denormalized tree rebuilt on save — no Cloud Functions, so the client write
// must recompute curricula/{id}.tree, gated by an isAdmin rule.
export const getCurriculumGroupTree = createServerFn({ method: 'GET' })
	.inputValidator((id: number) => id)
	.handler(async (ctx): Promise<AdminCurriculumTree | null> => {
		const snap = await getDoc(doc(db, 'curricula', String(ctx.data as number)))
		if (!snap.exists()) return null
		const c = snap.data() as Curriculum & { tree?: StoredTreeNode | null }
		const toNode = (n: StoredTreeNode, parentId: number | null): AdminGroupNode => ({
			id: n.id,
			parentId,
			type: n.type,
			name: n.name,
			credit: n.credit,
			color: n.color,
			acceptPrefix: n.acceptPrefix,
			subjects: n.subjects.map((s) => ({
				id: s.id,
				nameTh: s.nameTh,
				nameEn: s.nameEn,
				credit: s.credit,
			})),
			children: n.children.map((ch) => toNode(ch, n.id)),
		})
		return {
			curriculum: { id: c.id, nameTh: c.nameTh, nameEn: c.nameEn },
			root: c.tree ? toNode(c.tree, null) : null,
		}
	})

// Editing the group tree is NOT yet supported on Firestore. These writes keyed
// off a global group id, but the tree is now denormalized inside curricula/{id}.
// tree with no group→curriculum index — so a group id alone can't locate the
// doc to mutate. A proper fix needs a normalized `curriculumGroups` collection
// (then rebuild curricula/{id}.tree on save) or threading curriculumId through
// the editor. Until then the tree is read-only (seeded from Postgres); fail
// loudly rather than silently no-op so the admin editor surfaces the gap.
const NOT_SUPPORTED =
	'การแก้ไขโครงสร้างกลุ่มหลักสูตรยังไม่รองรับบน Firestore (โครงสร้างถูก denormalize ไว้ใน curricula/{id}.tree)'
// Real return types kept so the editor's call sites still typecheck; the handler
// always throws, so the admin UI shows the error instead of a silent no-op.
const reject = (): never => {
	throw new Error(NOT_SUPPORTED)
}

export const createCurriculumGroup = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (): Promise<{ id: number }> => reject())

export const updateCurriculumGroup = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (): Promise<{ id: number }> => reject())

export const deleteCurriculumGroup = createServerFn({ method: 'POST' })
	.inputValidator((id: number) => id)
	.handler(async (): Promise<{ ok: true; deleted: number }> => reject())

export const assignSubjectsToGroup = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (): Promise<{ added: number; skipped: string[] }> => reject())

export const removeSubjectFromGroup = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (): Promise<{ ok: true }> => reject())
