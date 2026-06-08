import type { SubjectFilter } from '@repo/core/schemas'
import { queryOptions } from '@tanstack/react-query'
import { getCurriculumGroupTree } from '~/server/curriculum-group'
import { listCurricula, listDepartments, listFaculties, listPrograms } from '~/server/hierarchy'
import { getMyCurriculumTree } from '~/server/progress'
import { getRegistrationPlan } from '~/server/registration'
import {
	getReviewEligibility,
	listCurriculumReviews,
	listLatestReviews,
	listReviews,
	listReviewsForSubject,
} from '~/server/reviews'
import {
	getSubject,
	getSubjectSchedules,
	listCurriculumElectives,
	listCurriculumGroupOptions,
	listOfferedElectives,
	listSectionsForSubject,
	listSubjects,
	listTeachtables,
} from '~/server/subjects'
import { getMyTranscript } from '~/server/transcript'

export const subjectsQuery = (filter: SubjectFilter) =>
	queryOptions({
		queryKey: ['subjects', filter],
		queryFn: () => listSubjects({ data: filter }),
	})

export const subjectQuery = (id: string) =>
	queryOptions({ queryKey: ['subject', id], queryFn: () => getSubject({ data: id }) })

export const subjectReviewsQuery = (id: string) =>
	queryOptions({
		queryKey: ['subject-reviews', id],
		queryFn: () => listReviewsForSubject({ data: id }),
	})

export const subjectSectionsQuery = (id: string) =>
	queryOptions({
		queryKey: ['subject-sections', id],
		queryFn: () => listSectionsForSubject({ data: id }),
	})

export const reviewEligibilityQuery = (id: string) =>
	queryOptions({
		queryKey: ['review-eligibility', id],
		queryFn: () => getReviewEligibility({ data: id }),
	})

export const latestReviewsQuery = (limit = 20) =>
	queryOptions({
		queryKey: ['latest-reviews', limit],
		queryFn: () => listLatestReviews({ data: limit }),
	})

export type ReviewsFeedParams = {
	search?: string
	sort?: 'latest' | 'popular' | 'rating'
	minRating?: number
}
export const reviewsFeedQuery = (params: ReviewsFeedParams) =>
	queryOptions({
		queryKey: ['reviews-feed', params],
		queryFn: () => listReviews({ data: params }),
	})

export const curriculumReviewsQuery = () =>
	queryOptions({
		queryKey: ['curriculum-reviews'],
		queryFn: () => listCurriculumReviews(),
	})

export const teachtablesQuery = () =>
	queryOptions({ queryKey: ['teachtables'], queryFn: () => listTeachtables() })

export const curriculumElectivesQuery = (curriculumId: number) =>
	queryOptions({
		queryKey: ['curriculum-electives', curriculumId],
		queryFn: () => listCurriculumElectives({ data: curriculumId }),
	})

export type OfferedElectivesParams = {
	q?: string
	facultyId?: number
	departmentId?: number
	includeRestricted?: boolean
	page: number
	pageSize: number
}
export const offeredElectivesQuery = (params: OfferedElectivesParams) =>
	queryOptions({
		queryKey: ['offered-electives', params],
		queryFn: () => listOfferedElectives({ data: params }),
	})

export const subjectSchedulesQuery = (subjectIds: string[]) =>
	queryOptions({
		queryKey: ['subject-schedules', [...subjectIds].sort()],
		queryFn: () => getSubjectSchedules({ data: subjectIds }),
	})

export const curriculumGroupOptionsQuery = (curriculumId: number) =>
	queryOptions({
		queryKey: ['curriculum-group-options', curriculumId],
		queryFn: () => listCurriculumGroupOptions({ data: curriculumId }),
	})

export const facultiesQuery = () =>
	queryOptions({ queryKey: ['faculties'], queryFn: () => listFaculties() })

export const departmentsQuery = (facultyId?: number) =>
	queryOptions({
		queryKey: ['departments', facultyId ?? null],
		queryFn: () => listDepartments({ data: facultyId }),
	})

export const programsQuery = (departmentId?: number) =>
	queryOptions({
		queryKey: ['programs', departmentId ?? null],
		queryFn: () => listPrograms({ data: departmentId }),
	})

export const curriculaQuery = (programId?: number) =>
	queryOptions({
		queryKey: ['curricula', programId ?? null],
		queryFn: () => listCurricula({ data: programId }),
	})

export const myTranscriptQuery = () =>
	queryOptions({ queryKey: ['my-transcript'], queryFn: () => getMyTranscript() })

export const myCurriculumTreeQuery = () =>
	queryOptions({ queryKey: ['my-curriculum-tree'], queryFn: () => getMyCurriculumTree() })

export const registrationPlanQuery = (studentId?: string) =>
	queryOptions({
		queryKey: ['registration-plan', studentId ?? null],
		queryFn: () => getRegistrationPlan({ data: studentId }),
	})

export const curriculumGroupTreeQuery = (curriculumId: number) =>
	queryOptions({
		queryKey: ['curriculum-group-tree', curriculumId],
		queryFn: () => getCurriculumGroupTree({ data: curriculumId }),
	})
