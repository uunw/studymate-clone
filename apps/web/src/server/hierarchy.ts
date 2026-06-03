import { asc, db, eq, schema } from '@repo/db'
import { createServerFn } from '@tanstack/react-start'

export const listFaculties = createServerFn({ method: 'GET' }).handler(async () => {
	return db.select().from(schema.faculty).orderBy(asc(schema.faculty.nameTh))
})

export const listDepartments = createServerFn({ method: 'GET' })
	.inputValidator((facultyId?: number) => facultyId ?? null)
	.handler(async ({ data: facultyId }) => {
		const base = db.select().from(schema.department)
		const rows = facultyId
			? await base.where(eq(schema.department.facultyId, facultyId))
			: await base
		return rows
	})

export const listPrograms = createServerFn({ method: 'GET' })
	.inputValidator((departmentId?: number) => departmentId ?? null)
	.handler(async ({ data: departmentId }) => {
		const base = db.select().from(schema.program)
		return departmentId ? base.where(eq(schema.program.departmentId, departmentId)) : base
	})

export const listCurricula = createServerFn({ method: 'GET' })
	.inputValidator((programId?: number) => programId ?? null)
	.handler(async ({ data: programId }) => {
		const base = db.select().from(schema.curriculum)
		return programId ? base.where(eq(schema.curriculum.programId, programId)) : base
	})

export const getCurriculum = createServerFn({ method: 'GET' })
	.inputValidator((id: number) => id)
	.handler(async ({ data: id }) => {
		const [row] = await db
			.select()
			.from(schema.curriculum)
			.where(eq(schema.curriculum.id, id))
			.limit(1)
		return row ?? null
	})
