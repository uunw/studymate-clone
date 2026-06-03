import {
	curriculumSchema,
	departmentSchema,
	facultySchema,
	programSchema,
} from '@repo/core/schemas'
import { db, eq, schema } from '@repo/db'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const idInput = z.object({ id: z.number().int() })

// ---- Faculty ----
export const saveFaculty = createServerFn({ method: 'POST' })
	.inputValidator(facultySchema)
	.handler(async ({ data }) => {
		const { requireAdmin } = await import('./auth.server')
		await requireAdmin()
		const values = {
			kmitlId: data.kmitlId,
			nameTh: data.nameTh,
			nameEn: data.nameEn,
			isVisible: data.isVisible ? 1 : 0,
		}
		if (data.id) {
			await db.update(schema.faculty).set(values).where(eq(schema.faculty.id, data.id))
			return { id: data.id }
		}
		const [row] = await db.insert(schema.faculty).values(values).returning()
		return { id: row!.id }
	})

export const deleteFaculty = createServerFn({ method: 'POST' })
	.inputValidator(idInput)
	.handler(async ({ data }) => {
		const { requireAdmin } = await import('./auth.server')
		await requireAdmin()
		await db.delete(schema.faculty).where(eq(schema.faculty.id, data.id))
		return { ok: true }
	})

// ---- Department ----
export const saveDepartment = createServerFn({ method: 'POST' })
	.inputValidator(departmentSchema)
	.handler(async ({ data }) => {
		const { requireAdmin } = await import('./auth.server')
		await requireAdmin()
		const values = {
			facultyId: data.facultyId,
			kmitlId: data.kmitlId,
			nameTh: data.nameTh,
			nameEn: data.nameEn,
			isVisible: data.isVisible ? 1 : 0,
		}
		if (data.id) {
			await db.update(schema.department).set(values).where(eq(schema.department.id, data.id))
			return { id: data.id }
		}
		const [row] = await db.insert(schema.department).values(values).returning()
		return { id: row!.id }
	})

export const deleteDepartment = createServerFn({ method: 'POST' })
	.inputValidator(idInput)
	.handler(async ({ data }) => {
		const { requireAdmin } = await import('./auth.server')
		await requireAdmin()
		await db.delete(schema.department).where(eq(schema.department.id, data.id))
		return { ok: true }
	})

// ---- Program ----
export const saveProgram = createServerFn({ method: 'POST' })
	.inputValidator(programSchema)
	.handler(async ({ data }) => {
		const { requireAdmin } = await import('./auth.server')
		await requireAdmin()
		const values = {
			departmentId: data.departmentId,
			kmitlId: data.kmitlId,
			nameTh: data.nameTh,
			nameEn: data.nameEn,
			isVisible: data.isVisible ? 1 : 0,
		}
		if (data.id) {
			await db.update(schema.program).set(values).where(eq(schema.program.id, data.id))
			return { id: data.id }
		}
		const [row] = await db.insert(schema.program).values(values).returning()
		return { id: row!.id }
	})

export const deleteProgram = createServerFn({ method: 'POST' })
	.inputValidator(idInput)
	.handler(async ({ data }) => {
		const { requireAdmin } = await import('./auth.server')
		await requireAdmin()
		await db.delete(schema.program).where(eq(schema.program.id, data.id))
		return { ok: true }
	})

// ---- Curriculum ----
export const saveCurriculum = createServerFn({ method: 'POST' })
	.inputValidator(curriculumSchema)
	.handler(async ({ data }) => {
		const { requireAdmin } = await import('./auth.server')
		await requireAdmin()
		const values = {
			programId: data.programId,
			groupId: data.groupId ?? null,
			year: data.year,
			nameTh: data.nameTh,
			nameEn: data.nameEn,
			isVisible: data.isVisible ? 1 : 0,
		}
		if (data.id) {
			await db.update(schema.curriculum).set(values).where(eq(schema.curriculum.id, data.id))
			return { id: data.id }
		}
		const [row] = await db.insert(schema.curriculum).values(values).returning()
		return { id: row!.id }
	})

export const deleteCurriculum = createServerFn({ method: 'POST' })
	.inputValidator(idInput)
	.handler(async ({ data }) => {
		const { requireAdmin } = await import('./auth.server')
		await requireAdmin()
		await db.delete(schema.curriculum).where(eq(schema.curriculum.id, data.id))
		return { ok: true }
	})
