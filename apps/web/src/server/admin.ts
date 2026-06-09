import {
	curriculumSchema,
	departmentSchema,
	facultySchema,
	programSchema,
} from '@repo/core/schemas'
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '~/lib/firebase'
import { createServerFn } from '~/lib/server-fn'
import { requireAdmin } from './session'

// Reference-data CRUD. Collections are keyed by String(numeric id) to match the
// seed; new docs get max(existing id)+1 (admin-only, no real concurrency). Writes
// are gated by requireAdmin() + the isAdmin() firestore rule on each collection.
async function nextId(col: string): Promise<number> {
	const snap = await getDocs(collection(db, col))
	return snap.docs.reduce((m, d) => Math.max(m, (d.data().id as number) ?? 0), 0) + 1
}
async function save(
	col: string,
	id: number | undefined,
	fields: Record<string, unknown>,
): Promise<{ id: number }> {
	await requireAdmin()
	const realId = id ?? (await nextId(col))
	await setDoc(doc(db, col, String(realId)), { id: realId, ...fields }, { merge: id != null })
	return { id: realId }
}
async function remove(col: string, id: number): Promise<{ ok: true }> {
	await requireAdmin()
	await deleteDoc(doc(db, col, String(id)))
	return { ok: true }
}
const idOf = (d: unknown) => (d as { id: number }).id

export const saveFaculty = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (ctx): Promise<{ id: number }> => {
		const data = facultySchema.parse(ctx.data)
		return save('faculties', data.id, {
			kmitlId: data.kmitlId,
			nameTh: data.nameTh,
			nameEn: data.nameEn,
			isVisible: data.isVisible ? 1 : 0,
		})
	})
export const deleteFaculty = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (ctx): Promise<{ ok: true }> => remove('faculties', idOf(ctx.data)))

export const saveDepartment = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (ctx): Promise<{ id: number }> => {
		const data = departmentSchema.parse(ctx.data)
		return save('departments', data.id, {
			facultyId: data.facultyId,
			kmitlId: data.kmitlId,
			nameTh: data.nameTh,
			nameEn: data.nameEn,
			isVisible: data.isVisible ? 1 : 0,
		})
	})
export const deleteDepartment = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (ctx): Promise<{ ok: true }> => remove('departments', idOf(ctx.data)))

export const saveProgram = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (ctx): Promise<{ id: number }> => {
		const data = programSchema.parse(ctx.data)
		return save('programs', data.id, {
			departmentId: data.departmentId,
			kmitlId: data.kmitlId,
			nameTh: data.nameTh,
			nameEn: data.nameEn,
			isVisible: data.isVisible ? 1 : 0,
		})
	})
export const deleteProgram = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (ctx): Promise<{ ok: true }> => remove('programs', idOf(ctx.data)))

export const saveCurriculum = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (ctx): Promise<{ id: number }> => {
		const data = curriculumSchema.parse(ctx.data)
		return save('curricula', data.id, {
			programId: data.programId,
			groupId: data.groupId ?? null,
			year: data.year,
			nameTh: data.nameTh,
			nameEn: data.nameEn,
			isVisible: data.isVisible ? 1 : 0,
		})
	})
export const deleteCurriculum = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (ctx): Promise<{ ok: true }> => remove('curricula', idOf(ctx.data)))
