import { describe, expect, it } from 'vitest'
import { calculateGpa, curriculumProgress, isPassing } from './academic'

describe('calculateGpa', () => {
	it('computes credit-weighted GPA', () => {
		// (4*3 + 3*3 + 2*3) / 9 = 3.0
		expect(
			calculateGpa([
				{ grade: 'A', credit: 3 },
				{ grade: 'B', credit: 3 },
				{ grade: 'C', credit: 3 },
			]),
		).toBe(3)
	})

	it('excludes S/U/T from GPA', () => {
		expect(
			calculateGpa([
				{ grade: 'A', credit: 3 },
				{ grade: 'S', credit: 3 },
			]),
		).toBe(4)
	})

	it('returns 0 with no graded courses', () => {
		expect(calculateGpa([{ grade: 'S', credit: 3 }])).toBe(0)
	})
})

describe('isPassing', () => {
	it.each([
		['A', true],
		['D', true],
		['F', false],
		['S', false],
	])('%s -> %s', (grade, expected) => {
		expect(isPassing(grade)).toBe(expected)
	})
})

describe('curriculumProgress', () => {
	it('caps percent at 100 and sums passed credits per group', () => {
		const out = curriculumProgress(
			[
				{ groupKey: 'core', credit: 3, passed: true },
				{ groupKey: 'core', credit: 3, passed: true },
				{ groupKey: 'core', credit: 3, passed: false },
				{ groupKey: 'gen', credit: 3, passed: true },
			],
			{ core: 3, gen: 6 },
		)
		expect(out.core).toEqual({ earned: 6, required: 3, percent: 100 })
		expect(out.gen).toEqual({ earned: 3, required: 6, percent: 50 })
	})
})
