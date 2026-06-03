import { describe, expect, it } from 'vitest'
import { parseTranscriptText } from './parser'

describe('parseTranscriptText', () => {
	it('parses Thai semester headers + rows', () => {
		const text = [
			'ภาคการศึกษาที่ 1 ปีการศึกษา 2566',
			'01006012 การโปรแกรมคอมพิวเตอร์ 3 A',
			'90641001 ภาษาอังกฤษพื้นฐาน 3 B+',
			'ภาคการศึกษาที่ 2 ปีการศึกษา 2566',
			'01076014 โครงสร้างข้อมูล 3 C+',
		].join('\n')

		const rows = parseTranscriptText(text)
		expect(rows).toHaveLength(3)
		expect(rows[0]).toMatchObject({ subjectId: '01006012', grade: 'A', year: 2566, term: 1 })
		expect(rows[1]).toMatchObject({ subjectId: '90641001', grade: 'B+', term: 1 })
		expect(rows[2]).toMatchObject({ subjectId: '01076014', grade: 'C+', year: 2566, term: 2 })
	})

	it('parses English headers', () => {
		const rows = parseTranscriptText('Semester 1 / 2567\n01076021 Database Systems 3 B')
		expect(rows[0]).toMatchObject({ subjectId: '01076021', grade: 'B', year: 2567, term: 1 })
	})

	it('dedupes re-takes, keeping the latest grade', () => {
		const text = ['ภาคการศึกษาที่ 1 ปีการศึกษา 2566', '01006012 Prog 3 F', '01006012 Prog 3 A'].join(
			'\n',
		)
		const rows = parseTranscriptText(text)
		expect(rows).toHaveLength(1)
		expect(rows[0]?.grade).toBe('A')
	})

	it('ignores lines without a valid subject code or grade', () => {
		expect(parseTranscriptText('Transcript of Records\nName: Test User')).toHaveLength(0)
	})
})
