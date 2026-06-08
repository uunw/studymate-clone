import { describe, expect, it } from 'vitest'
import { isSectionOpenToStudent, majorToken } from './eligibility'

describe('isSectionOpenToStudent', () => {
	const ID = 67015067
	const CTX = { major: 'คอมพิวเตอร์', faculty: 'วิศวกรรมศาสตร์' }

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

	it('major restriction: closed for another major, open for the student major', () => {
		expect(isSectionOpenToStudent('เฉพาะสาขาวิศวกรรมโยธา (วศ.)', ID, CTX)).toBe(false)
		expect(isSectionOpenToStudent('เฉพาะสาขาวิศวกรรมไฟฟ้า (วศ.)', ID, CTX)).toBe(false)
		expect(isSectionOpenToStudent('เฉพาะสาขาวิศวกรรมคอมพิวเตอร์ (ต่อเนื่อง) (วศ.)', ID, CTX)).toBe(true)
	})

	it('major restriction binds even when the faculty matches', () => {
		expect(isSectionOpenToStudent('เฉพาะคณะวิศวกรรมศาสตร์ เฉพาะสาขาวิศวกรรมโยธา (วศ.)', ID, CTX)).toBe(
			false,
		)
	})

	it('faculty-only restriction: open when the faculty matches', () => {
		expect(isSectionOpenToStudent('เฉพาะคณะวิศวกรรมศาสตร์', ID, CTX)).toBe(true)
	})

	it('combined id + other major: closed', () => {
		expect(
			isSectionOpenToStudent(
				'เฉพาะสาขาวิศวกรรมโยธา (วศ.) เฉพาะรหัสนักศึกษาในช่วง 69010001 - 69015999',
				ID,
				CTX,
			),
		).toBe(false)
	})

	it('major rule treated as open when no major context is given', () => {
		expect(isSectionOpenToStudent('เฉพาะสาขาวิศวกรรมโยธา (วศ.)', ID)).toBe(true)
	})

	it('open when student id is not a finite number', () => {
		expect(isSectionOpenToStudent('เฉพาะรหัสนักศึกษา 65010211', Number.NaN)).toBe(true)
	})
})

describe('majorToken', () => {
	it('extracts the distinctive major token', () => {
		expect(majorToken('วิศวกรรมคอมพิวเตอร์ (ต่อเนื่อง)')).toBe('คอมพิวเตอร์')
		expect(majorToken('วิศวกรรมโยธา')).toBe('โยธา')
		expect(majorToken(null)).toBe('')
	})
})
