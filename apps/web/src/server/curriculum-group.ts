import { createServerFn } from '~/lib/server-fn'

export type AdminGroupSubject = {
	id: string
	nameTh: string | null
	nameEn: string | null
	credit: number | null
}
export type AdminGroupNode = {
	id: number
	parentId: number | null
	type: string | null
	name: string | null
	credit: number | null
	color: string | null
	acceptPrefix: string | null
	subjects: AdminGroupSubject[]
	children: AdminGroupNode[]
}
export type AdminCurriculumTree = {
	curriculum: { id: number; nameTh: string | null; nameEn: string | null }
	root: AdminGroupNode | null
}

export const GROUP_TYPES = [
	'COLLECTIVE',
	'REQUIRED_ALL',
	'REQUIRED_CREDIT',
	'REQUIRED_BRANCH',
	'FREE',
] as const

// TODO(phase 4): Firestore curricula/{id}.tree + admin writes.
export const getCurriculumGroupTree = createServerFn({ method: 'GET' })
	.inputValidator((id: number) => id)
	.handler(async (): Promise<AdminCurriculumTree | null> => null)

export const createCurriculumGroup = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (): Promise<{ id: number }> => ({ id: 0 }))

export const updateCurriculumGroup = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (): Promise<{ id: number }> => ({ id: 0 }))

export const deleteCurriculumGroup = createServerFn({ method: 'POST' })
	.inputValidator((id: number) => id)
	.handler(async (): Promise<{ ok: true; deleted: number }> => ({ ok: true, deleted: 0 }))

export const assignSubjectsToGroup = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (): Promise<{ added: number; skipped: string[] }> => ({ added: 0, skipped: [] }))

export const removeSubjectFromGroup = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (): Promise<{ ok: true }> => ({ ok: true }))
