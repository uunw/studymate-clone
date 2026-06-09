import type { Subject, SubjectClass, Teachtable } from '@repo/db'
import { createServerFn } from '~/lib/server-fn'

// TODO(phase 4): all of these read from Firestore (subjects/sections collections).

type SubjectListItem = Pick<Subject, 'id' | 'nameTh' | 'nameEn' | 'credit'> & {
	rating: number
	reviewCount: number
	openSections: number
	ruleTh: string | null
}
export const listSubjects = createServerFn({ method: 'GET' })
	.inputValidator((d: unknown) => d)
	.handler(
		async (): Promise<{
			items: SubjectListItem[]
			page: number
			pageSize: number
			total: number
			totalPages: number
		}> => ({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 }),
	)

export const getSubject = createServerFn({ method: 'GET' })
	.inputValidator((id: string) => id)
	.handler(async (): Promise<Subject & { rating: number; reviewCount: number }> => {
		throw new Error('NOT_FOUND')
	})

export type GroupOption = {
	id: number
	name: string | null
	type: string | null
	color: string | null
	children: GroupOption[]
}
export const listCurriculumGroupOptions = createServerFn({ method: 'GET' })
	.inputValidator((id: number) => id)
	.handler(async (): Promise<GroupOption[]> => [])

export type OfferedElective = {
	id: string
	nameTh: string | null
	nameEn: string | null
	credit: number | null
	ruleTh: string | null
	restricted: boolean
}
export const listOfferedElectives = createServerFn({ method: 'GET' })
	.inputValidator((d: unknown) => d)
	.handler(
		async (): Promise<{
			items: OfferedElective[]
			page: number
			pageSize: number
			total: number
			totalPages: number
		}> => ({ items: [], page: 1, pageSize: 8, total: 0, totalPages: 1 }),
	)

export type CurriculumElective = {
	id: string
	nameTh: string | null
	nameEn: string | null
	credit: number | null
	ruleTh: string | null
}
export const listCurriculumElectives = createServerFn({ method: 'GET' })
	.inputValidator((id: number) => id)
	.handler(async (): Promise<CurriculumElective[]> => [])

export type SubjectSchedule = {
	subjectId: string | null
	section: string | null
	day: number | null
	timeStart: string | null
	timeEnd: string | null
	examMidterm: string | null
	examFinal: string | null
	ruleTh: string | null
}
export const getSubjectSchedules = createServerFn({ method: 'GET' })
	.inputValidator((ids: string[]) => ids)
	.handler(async (): Promise<SubjectSchedule[]> => [])

export type OfferedSchedule = {
	subjectId: string
	day: number | null
	timeStart: string | null
	timeEnd: string | null
	sections: number
	capacity: number
	preCount: number
}
export const listOfferedSchedules = createServerFn({ method: 'GET' }).handler(
	async (): Promise<OfferedSchedule[]> => [],
)

export const listTeachtables = createServerFn({ method: 'GET' }).handler(
	async (): Promise<Teachtable[]> => [],
)

type Section = Pick<
	SubjectClass,
	| 'id'
	| 'section'
	| 'lectOrPrac'
	| 'day'
	| 'timeStart'
	| 'timeEnd'
	| 'room'
	| 'building'
	| 'teacherTh'
	| 'capacity'
	| 'enrolled'
	| 'closed'
> & { year: number | null; term: number | null }
export const listSectionsForSubject = createServerFn({ method: 'GET' })
	.inputValidator((id: string) => id)
	.handler(async (): Promise<Section[]> => [])
