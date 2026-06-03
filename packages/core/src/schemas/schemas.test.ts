import { describe, expect, it } from 'vitest'
import { signInSchema, signUpSchema } from './auth'
import { reviewSchema } from './review'

describe('signInSchema', () => {
	it('accepts an 8-digit student id', () => {
		expect(signInSchema.safeParse({ studentId: '64010001', password: 'x' }).success).toBe(true)
	})
	it('rejects a non-8-digit student id', () => {
		expect(signInSchema.safeParse({ studentId: '123', password: 'x' }).success).toBe(false)
	})
})

describe('signUpSchema', () => {
	const base = {
		studentId: '64010001',
		firstName: 'A',
		lastName: 'B',
		nickname: 'C',
		password: 'Test@1234',
		passwordConfirm: 'Test@1234',
	}
	it('accepts a strong, matching password', () => {
		expect(signUpSchema.safeParse(base).success).toBe(true)
	})
	it('rejects a weak password', () => {
		expect(
			signUpSchema.safeParse({ ...base, password: 'weak', passwordConfirm: 'weak' }).success,
		).toBe(false)
	})
	it('rejects mismatched confirmation', () => {
		expect(signUpSchema.safeParse({ ...base, passwordConfirm: 'Other@1234' }).success).toBe(false)
	})
})

describe('reviewSchema', () => {
	it('requires a rating and a non-empty review', () => {
		expect(
			reviewSchema.safeParse({ subjectId: '01006012', year: 2566, term: 1, rating: 0, review: '' })
				.success,
		).toBe(false)
		expect(
			reviewSchema.safeParse({ subjectId: '01006012', year: 2566, term: 1, rating: 4, review: 'ดี' })
				.success,
		).toBe(true)
	})
})
