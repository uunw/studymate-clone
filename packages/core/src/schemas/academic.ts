import { z } from 'zod'
import { SUBJECT_ID_RE } from '../constants'

const nameFields = {
	nameTh: z.string().trim().min(1).max(256),
	nameEn: z.string().trim().min(1).max(256),
}

export const facultySchema = z.object({
	id: z.number().int().optional(),
	// required (may be empty) so the shape matches TanStack Form's defaultValues type
	kmitlId: z.string().trim().max(64),
	...nameFields,
	isVisible: z.boolean(),
})
export type FacultyInput = z.infer<typeof facultySchema>

export const departmentSchema = facultySchema.extend({
	facultyId: z.number().int().positive(),
})
export type DepartmentInput = z.infer<typeof departmentSchema>

export const programSchema = facultySchema.extend({
	departmentId: z.number().int().positive(),
})
export type ProgramInput = z.infer<typeof programSchema>

export const curriculumSchema = z.object({
	id: z.number().int().optional(),
	programId: z.number().int().positive(),
	groupId: z.number().int().positive().optional(),
	year: z.number().int().min(2500).max(2600),
	...nameFields,
	isVisible: z.boolean(),
})
export type CurriculumInput = z.infer<typeof curriculumSchema>

/** Subject browse filters. */
export const subjectFilterSchema = z.object({
	q: z.string().trim().optional(),
	curriculumId: z.coerce.number().int().positive().optional(),
	year: z.coerce.number().int().optional(),
	term: z.coerce.number().int().min(1).max(3).optional(),
	isGened: z.coerce.boolean().optional(),
	// "offered this term" — accept bool or the 'true'/'false' URL string
	openOnly: z.union([z.boolean(), z.string()]).optional(),
	// day of week a section is offered (1 = Mon … 7 = Sun)
	day: z.coerce.number().int().min(1).max(7).optional(),
	// minimum average review rating
	minRating: z.coerce.number().min(0).max(5).optional(),
	// restrict to subjects in these curriculum groups (checkbox-tree filter)
	groupIds: z.array(z.coerce.number().int()).optional(),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(10),
})
export type SubjectFilter = z.infer<typeof subjectFilterSchema>

export const subjectIdSchema = z.string().regex(SUBJECT_ID_RE)
