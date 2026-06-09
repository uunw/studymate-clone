import type { Curriculum, Department, Faculty, Program } from '@repo/db'
import { createServerFn } from '~/lib/server-fn'

// TODO(phase 4): read from Firestore (faculties/departments/programs/curricula).
export const listFaculties = createServerFn({ method: 'GET' }).handler(
	async (): Promise<Faculty[]> => [],
)

export const listDepartments = createServerFn({ method: 'GET' })
	.inputValidator((facultyId?: number) => facultyId ?? null)
	.handler(async (): Promise<Department[]> => [])

export const listPrograms = createServerFn({ method: 'GET' })
	.inputValidator((departmentId?: number) => departmentId ?? null)
	.handler(async (): Promise<Program[]> => [])

export const listCurricula = createServerFn({ method: 'GET' })
	.inputValidator((programId?: number) => programId ?? null)
	.handler(async (): Promise<Curriculum[]> => [])

export const getCurriculum = createServerFn({ method: 'GET' })
	.inputValidator((id: number) => id)
	.handler(async (): Promise<Curriculum | null> => null)
