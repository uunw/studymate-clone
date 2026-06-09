import { createServerFn } from '~/lib/server-fn'

export type PlanItem = {
	subjectId: string
	section: string | null
	nameTh: string | null
	nameEn: string | null
	credit: number | null
	groupName: string | null
	taken: boolean
}

export type RegistrationPlan = {
	studentId: string
	items: PlanItem[]
	totalCredit: number
	error: 'INVALID_ID' | 'FETCH_FAILED' | null
}

// TODO(phase 4): call the registrar API client-side (or via a small proxy).
export const getRegistrationPlan = createServerFn({ method: 'GET' })
	.inputValidator((studentId?: string) => studentId ?? '')
	.handler(
		async (): Promise<RegistrationPlan> => ({
			studentId: '',
			items: [],
			totalCredit: 0,
			error: null,
		}),
	)
