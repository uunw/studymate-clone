import type { ProgressGroupInput } from '@repo/core/progress'
import { createServerFn } from '~/lib/server-fn'

export type CurriculumTree = {
	curriculum: { id: number; nameTh: string | null; nameEn: string | null; year: number | null }
	root: ProgressGroupInput
}

// TODO(phase 4): build from Firestore curricula/{id}.tree.
export const getMyCurriculumTree = createServerFn({ method: 'GET' }).handler(
	async (): Promise<CurriculumTree | null> => null,
)
