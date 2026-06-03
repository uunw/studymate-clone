import { describe, expect, it } from 'vitest'
import { formatTerm, formatThaiDate, toBuddhistYear } from './format'
import { pageBounds, paginate } from './pagination'

describe('format', () => {
	it('converts to Buddhist year', () => {
		expect(toBuddhistYear(new Date('2026-06-03'))).toBe(2569)
	})

	it('formats a Thai date', () => {
		expect(formatThaiDate(new Date('2026-06-03'))).toBe('3 มิ.ย. 2569')
	})

	it('formats a term label', () => {
		expect(formatTerm(2566, 1)).toBe('ภาคเรียนที่ 1/2566')
	})
})

describe('pagination', () => {
	it('paginates and clamps the page', () => {
		const all = Array.from({ length: 25 }, (_, i) => i)
		const p = paginate(all, 2, 10)
		expect(p).toMatchObject({ page: 2, pageSize: 10, total: 25, totalPages: 3 })
		expect(p.items).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19])

		// out-of-range page clamps to last
		expect(paginate(all, 99, 10).page).toBe(3)
	})

	it('computes SQL bounds', () => {
		expect(pageBounds(3, 10)).toEqual({ limit: 10, offset: 20 })
		expect(pageBounds(1, 10)).toEqual({ limit: 10, offset: 0 })
	})
})
