import { z } from 'zod'
import { SUBJECT_ID_RE } from '../constants'

export const reviewSchema = z.object({
	subjectId: z.string().regex(SUBJECT_ID_RE),
	year: z.number().int().min(2500).max(2600),
	term: z.number().int().min(1).max(3),
	rating: z.number().min(0.5, 'กรุณาให้คะแนน').max(5),
	review: z.string().trim().min(1, 'กรุณาเขียนรีวิว').max(5000),
})
export type ReviewInput = z.infer<typeof reviewSchema>

export const profileSchema = z.object({
	firstName: z.string().trim().min(1).max(256),
	lastName: z.string().trim().min(1).max(256),
	nickname: z.string().trim().min(1).max(256),
})
export type ProfileInput = z.infer<typeof profileSchema>

export const selectCurriculumSchema = z.object({
	curriculumId: z.number().int().positive(),
})
