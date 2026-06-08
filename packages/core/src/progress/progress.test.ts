import { describe, expect, it } from 'vitest'
import { allocateProgress, type ProgressGroupInput } from './allocate'
import { termGpa } from './gpa'

const sub = (id: string, credit: number) => ({ id, credit })

describe('allocateProgress', () => {
	it('REQUIRED_ALL: complete only when every subject matched', () => {
		const root: ProgressGroupInput = {
			id: 1,
			name: 'core',
			type: 'REQUIRED_ALL',
			credit: 0,
			color: null,
			subjects: [sub('A', 3), sub('B', 3)],
			children: [],
		}
		const partial = allocateProgress(root, [{ subjectId: 'A', credit: 3, grade: 'A' }])
		expect(partial.totalRequired).toBe(6)
		expect(partial.totalUsed).toBe(3)
		expect(partial.complete).toBe(false)

		const full = allocateProgress(root, [
			{ subjectId: 'A', credit: 3, grade: 'A' },
			{ subjectId: 'B', credit: 3, grade: 'C' },
		])
		expect(full.totalUsed).toBe(6)
		expect(full.complete).toBe(true)
	})

	it('REQUIRED_CREDIT: caps used at requirement, complete at threshold', () => {
		const root: ProgressGroupInput = {
			id: 1,
			name: 'electives',
			type: 'REQUIRED_CREDIT',
			credit: 6,
			color: null,
			subjects: [sub('A', 3), sub('B', 3), sub('C', 3)],
			children: [],
		}
		const r = allocateProgress(root, [
			{ subjectId: 'A', credit: 3, grade: 'A' },
			{ subjectId: 'B', credit: 3, grade: 'B' },
			{ subjectId: 'C', credit: 3, grade: 'C' },
		])
		expect(r.totalRequired).toBe(6)
		expect(r.totalUsed).toBe(6) // capped, not 9
		expect(r.complete).toBe(true)
	})

	it('FREE: any subject counts toward credit, even non-members', () => {
		const root: ProgressGroupInput = {
			id: 1,
			name: 'free',
			type: 'FREE',
			credit: 6,
			color: null,
			subjects: [],
			children: [],
		}
		const r = allocateProgress(root, [
			{ subjectId: 'X', credit: 3, grade: 'A' },
			{ subjectId: 'Y', credit: 3, grade: 'B' },
		])
		expect(r.totalUsed).toBe(6)
		expect(r.complete).toBe(true)
	})

	it('excludes F/U; X only with includeX; keeps best grade on retake', () => {
		const root: ProgressGroupInput = {
			id: 1,
			name: 'g',
			type: 'REQUIRED_CREDIT',
			credit: 9,
			color: null,
			subjects: [sub('A', 3), sub('B', 3), sub('C', 3)],
			children: [],
		}
		const r = allocateProgress(root, [
			{ subjectId: 'A', credit: 3, grade: 'F' }, // excluded
			{ subjectId: 'A', credit: 3, grade: 'B' }, // best kept
			{ subjectId: 'B', credit: 3, grade: 'U' }, // excluded
			{ subjectId: 'C', credit: 3, grade: 'X' }, // excluded unless includeX
		])
		expect(r.totalUsed).toBe(3) // only A:B
		const withX = allocateProgress(root, [{ subjectId: 'C', credit: 3, grade: 'X' }], {
			includeX: true,
		})
		expect(withX.totalUsed).toBe(3)
	})

	it('nested tree: rolls child usage up to the root and respects DFS membership', () => {
		const root: ProgressGroupInput = {
			id: 1,
			name: 'curriculum',
			type: 'COLLECTIVE',
			credit: null,
			color: null,
			subjects: [],
			children: [
				{
					id: 2,
					name: 'major',
					type: 'REQUIRED_ALL',
					credit: 0,
					color: null,
					subjects: [sub('M1', 3), sub('M2', 3)],
					children: [],
				},
				{
					id: 3,
					name: 'free',
					type: 'FREE',
					credit: 3,
					color: null,
					subjects: [],
					children: [],
				},
			],
		}
		const r = allocateProgress(root, [
			{ subjectId: 'M1', credit: 3, grade: 'A' },
			{ subjectId: 'M2', credit: 3, grade: 'B' },
			{ subjectId: 'Z', credit: 3, grade: 'C' }, // not a member of major → falls to FREE
		])
		expect(r.totalRequired).toBe(9) // 6 (major) + 3 (free)
		expect(r.totalUsed).toBe(9)
		expect(r.complete).toBe(true)
		const major = r.root.children.find((c) => c.id === 2)
		expect(major?.matched.sort()).toEqual(['M1', 'M2'])
	})
})

describe('termGpa', () => {
	it('computes per-term GPS and running cumulative GPA, skipping S/T/U', () => {
		const { terms, finalGpa } = termGpa([
			{ grade: 'A', credit: 3, year: 2566, term: 1 },
			{ grade: 'B', credit: 3, year: 2566, term: 1 },
			{ grade: 'S', credit: 1, year: 2566, term: 1 }, // skipped
			{ grade: 'C', credit: 3, year: 2566, term: 2 },
			{ grade: 'T', credit: 3, year: null, term: null }, // transfer, skipped
		])
		const t1 = terms.find((t) => t.key === '2566-1')!
		expect(t1.gps).toBe(3.5) // (4*3 + 3*3) / 6
		expect(t1.gpa).toBe(3.5)
		const t2 = terms.find((t) => t.key === '2566-2')!
		expect(t2.gps).toBe(2) // C only
		expect(t2.gpa).toBe(3) // (12+9+6) / 9
		expect(finalGpa).toBe(3)
	})
})
