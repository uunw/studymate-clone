import { db } from './client'
import {
	curriculum,
	curriculumGroup,
	department,
	faculty,
	program,
	subject,
	teachtable,
} from './schema'

/**
 * Seeds academic reference data only (no user-dependent rows).
 * Demo users are created through Better Auth — see `pnpm --filter @repo/auth seed`.
 * Idempotent-ish: relies on `onConflictDoNothing` where a natural key exists.
 */
async function main() {
	console.log('🌱 seeding academic reference data...')

	const [eng] = await db
		.insert(faculty)
		.values({ kmitlId: '01', nameTh: 'คณะวิศวกรรมศาสตร์', nameEn: 'Engineering' })
		.returning()

	const [ce] = await db
		.insert(department)
		.values({
			facultyId: eng!.id,
			kmitlId: '0101',
			nameTh: 'ภาควิชาวิศวกรรมคอมพิวเตอร์',
			nameEn: 'Computer Engineering',
		})
		.returning()

	const [ceProg] = await db
		.insert(program)
		.values({
			departmentId: ce!.id,
			kmitlId: '010101',
			nameTh: 'วิศวกรรมคอมพิวเตอร์',
			nameEn: 'Computer Engineering',
		})
		.returning()

	const [rootGroup] = await db
		.insert(curriculumGroup)
		.values({ parentId: null, type: 'root', name: 'หมวดวิชา', credit: 145, color: '#2563eb' })
		.returning()

	await db.insert(curriculum).values({
		programId: ceProg!.id,
		groupId: rootGroup!.id,
		year: 2563,
		nameTh: 'หลักสูตรวิศวกรรมคอมพิวเตอร์ 2563',
		nameEn: 'Computer Engineering Curriculum 2020',
	})

	await db.insert(teachtable).values([
		{ year: 2566, term: 1 },
		{ year: 2566, term: 2 },
		{ year: 2567, term: 1 },
		{ year: 2567, term: 2 },
	])

	await db
		.insert(subject)
		.values([
			{
				id: '01006012',
				nameTh: 'การโปรแกรมคอมพิวเตอร์',
				nameEn: 'Computer Programming',
				credit: 3,
				detail: 'พื้นฐานการเขียนโปรแกรมด้วยภาษา C',
			},
			{
				id: '01076014',
				nameTh: 'โครงสร้างข้อมูลและอัลกอริทึม',
				nameEn: 'Data Structures and Algorithms',
				credit: 3,
				detail: 'โครงสร้างข้อมูลพื้นฐานและการวิเคราะห์อัลกอริทึม',
			},
			{
				id: '01076021',
				nameTh: 'ระบบฐานข้อมูล',
				nameEn: 'Database Systems',
				credit: 3,
				detail: 'แบบจำลองเชิงสัมพันธ์ SQL และการออกแบบฐานข้อมูล',
			},
			{
				id: '01076025',
				nameTh: 'วิศวกรรมซอฟต์แวร์',
				nameEn: 'Software Engineering',
				credit: 3,
				detail: 'กระบวนการพัฒนาซอฟต์แวร์ และการจัดการโครงการ',
			},
			{
				id: '90641001',
				nameTh: 'ภาษาอังกฤษพื้นฐาน',
				nameEn: 'Foundation English',
				credit: 3,
				detail: 'ทักษะภาษาอังกฤษเพื่อการสื่อสาร',
			},
		])
		.onConflictDoNothing()

	console.log('✅ seed complete')
	process.exit(0)
}

main().catch((err) => {
	console.error('❌ seed failed:', err)
	process.exit(1)
})
