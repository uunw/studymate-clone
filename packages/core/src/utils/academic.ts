import { groupBy, prop, sumBy } from 'remeda'
import { GRADE_POINTS } from '../constants'

export type GradedCourse = { grade: string; credit: number }

/** GPAX over GPA-bearing grades only (S/U/T/W excluded). */
export function calculateGpa(courses: readonly GradedCourse[]): number {
	const graded = courses.filter((c) => GRADE_POINTS[c.grade] != null)
	const totalCredits = sumBy(graded, prop('credit'))
	if (totalCredits === 0) return 0
	const points = sumBy(graded, (c) => (GRADE_POINTS[c.grade] ?? 0) * c.credit)
	return Math.round((points / totalCredits) * 100) / 100
}

export type GroupProgress = { earned: number; required: number; percent: number }

/** Credits earned vs required per curriculum-group key. */
export function curriculumProgress(
	completed: readonly { groupKey: string; credit: number; passed: boolean }[],
	requirements: Readonly<Record<string, number>>,
): Record<string, GroupProgress> {
	const byGroup = groupBy(
		completed.filter((c) => c.passed),
		prop('groupKey'),
	)
	const out: Record<string, GroupProgress> = {}
	for (const [key, required] of Object.entries(requirements)) {
		const earned = sumBy(byGroup[key] ?? [], prop('credit'))
		out[key] = {
			earned,
			required,
			percent: required === 0 ? 0 : Math.min(100, Math.round((earned / required) * 100)),
		}
	}
	return out
}

/** A grade counts as "passed" if it carries a positive grade point (>= D, i.e. > 0). */
export function isPassing(grade: string): boolean {
	const gp = GRADE_POINTS[grade]
	return gp != null && gp > 0
}
