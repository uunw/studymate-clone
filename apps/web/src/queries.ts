import type { SubjectFilter } from '@repo/core/schemas'
import { queryOptions } from '@tanstack/react-query'
import { listCurricula, listDepartments, listFaculties, listPrograms } from '~/server/hierarchy'
import { listLatestReviews, listReviewsForSubject } from '~/server/reviews'
import { getSubject, listSubjects, listTeachtables } from '~/server/subjects'
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

export const latestReviewsQuery = (limit = 20) =>
	queryOptions({
		queryKey: ['latest-reviews', limit],
		queryFn: () => listLatestReviews({ data: limit }),
	})

export const teachtablesQuery = () =>
	queryOptions({ queryKey: ['teachtables'], queryFn: () => listTeachtables() })

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
