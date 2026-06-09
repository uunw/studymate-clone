import { createServerFn } from '~/lib/server-fn'

// TODO(phase 4): Firestore admin writes (faculties/departments/programs/curricula).
const saveFn = () =>
	createServerFn({ method: 'POST' })
		.inputValidator((d: unknown) => d)
		.handler(async (): Promise<{ id: number }> => ({ id: 0 }))
const deleteFn = () =>
	createServerFn({ method: 'POST' })
		.inputValidator((d: unknown) => d)
		.handler(async (): Promise<{ ok: true }> => ({ ok: true }))

export const saveFaculty = saveFn()
export const deleteFaculty = deleteFn()
export const saveDepartment = saveFn()
export const deleteDepartment = deleteFn()
export const saveProgram = saveFn()
export const deleteProgram = deleteFn()
export const saveCurriculum = saveFn()
export const deleteCurriculum = deleteFn()
