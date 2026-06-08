import { describe, expect, it } from 'vitest'
import { isSectionOpenToStudent } from './eligibility'

describe('isSectionOpenToStudent', () => {
	const ID = 67015067

	it('open when there is no rule', () => {
		expect(isSectionOpenToStudent(null, ID)).toBe(true)
		expect(isSectionOpenToStudent('', ID)).toBe(true)
		expect(isSectionOpenToStudent('   ', ID)).toBe(true)
	})

	it('id-range: open only when the id is in range', () => {
		expect(isSectionOpenToStudent('เฉพาะรหัสนักศึกษาในช่วง 69010001 - 69015999', ID)).toBe(false)
		expect(isSectionOpenToStudent('เฉพาะรหัสนักศึกษาในช่วง 67010001 - 67019999', ID)).toBe(true)
	})

	it('multiple ranges: open if any contains the id', () => {
		expect(isSectionOpenToStudent('ในช่วง 66010001 - 66019999, 67010001 - 67019999', ID)).toBe(true)
	})

	it('explicit single id(s)', () => {
		expect(isSectionOpenToStudent('เฉพาะรหัสนักศึกษา 65010211', ID)).toBe(false)
		expect(isSectionOpenToStudent('เฉพาะรหัสนักศึกษา 67015067', ID)).toBe(true)
	})

	it('major-only restriction is treated as open (can not verify the major)', () => {
		expect(isSectionOpenToStudent('เฉพาะสาขาวิศวกรรมโยธา (วศ.)', ID)).toBe(true)
	})

	it('open when student id is not a finite number', () => {
		expect(isSectionOpenToStudent('เฉพาะรหัสนักศึกษา 65010211', Number.NaN)).toBe(true)
	})
})
