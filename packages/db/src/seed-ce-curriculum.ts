import { db, eq, inArray, schema, sql } from './index'

/**
 * KMITL Computer Engineering (Continuing) curriculum — ปป.64, 114 credits.
 * Source: official curriculum PDF. Thai names hand-corrected (the PDF font's
 * ToUnicode map drops Thai combining marks, so text extraction is lossy);
 * English names + codes + credits are verbatim from the document.
 *
 * Idempotent: subjects are upserted, the program/group/curriculum structure is
 * created only once, and group↔subject links are synced (missing links added)
 * every run.
 */

type Subj = { id: string; nameTh: string; nameEn: string; credit: number; group: string }

const SUBJECTS: Subj[] = [
	{ id: '01076011', nameTh: 'ระบบปฏิบัติการ', nameEn: 'OPERATING SYSTEMS', credit: 3, group: 'core' },
	{
		id: '01076016',
		nameTh: 'การเตรียมโครงงานวิศวกรรมคอมพิวเตอร์',
		nameEn: 'COMPUTER ENGINEERING PROJECT PREPARATION',
		credit: 2,
		group: 'eng',
	},
	{ id: '01076031', nameTh: 'แคลคูลัส', nameEn: 'CALCULUS', credit: 3, group: 'eng' },
	{
		id: '01076034',
		nameTh: 'หลักการของกระบวนการพัฒนาซอฟต์แวร์',
		nameEn: 'PRINCIPLES OF SOFTWARE DEVELOPMENT PROCESS',
		credit: 3,
		group: 'core',
	},
	{
		id: '01076035',
		nameTh: 'กระบวนการพัฒนาซอฟต์แวร์เชิงปฏิบัติ',
		nameEn: 'SOFTWARE DEVELOPMENT PROCESS IN PRACTICE',
		credit: 3,
		group: 'core',
	},
	{
		id: '01076036',
		nameTh: 'การออกแบบประสบการณ์และส่วนติดต่อผู้ใช้',
		nameEn: 'USER EXPERIENCE AND USER INTERFACE DESIGN',
		credit: 2,
		group: 'e_sw',
	},
	{
		id: '01076037',
		nameTh: 'โครงงานออกแบบประสบการณ์และส่วนติดต่อผู้ใช้',
		nameEn: 'USER EXPERIENCE AND USER INTERFACE PROJECT',
		credit: 1,
		group: 'e_sw',
	},
	{
		id: '01076040',
		nameTh: 'มาตรฐานและเทคโนโลยีเครือข่าย',
		nameEn: 'INTERNETWORKING STANDARDS AND TECHNOLOGIES',
		credit: 3,
		group: 'core',
	},
	{
		id: '01076041',
		nameTh: 'ปฏิบัติการมาตรฐานและเทคโนโลยีเครือข่าย',
		nameEn: 'INTERNETWORKING STANDARDS AND TECHNOLOGIES IN PRACTICE',
		credit: 1,
		group: 'core',
	},
	{
		id: '01076042',
		nameTh: 'ความมั่นคงข้อมูลและคอมพิวเตอร์',
		nameEn: 'INFORMATION AND COMPUTER SECURITY',
		credit: 3,
		group: 'e_cy',
	},
	{
		id: '01076043',
		nameTh: 'สถาปัตยกรรมคลาวด์เบื้องต้น',
		nameEn: 'INTRODUCTION TO CLOUD ARCHITECTURE',
		credit: 2,
		group: 'core',
	},
	{
		id: '01076044',
		nameTh: 'ปฏิบัติการสถาปัตยกรรมคลาวด์เบื้องต้น',
		nameEn: 'INTRODUCTION TO CLOUD ARCHITECTURE IN PRACTICE',
		credit: 1,
		group: 'core',
	},
	{
		id: '01076050',
		nameTh: 'การประยุกต์และพัฒนาไมโครคอนโทรลเลอร์',
		nameEn: 'MICROCONTROLLER APPLICATION AND DEVELOPMENT',
		credit: 3,
		group: 'core',
	},
	{
		id: '01076051',
		nameTh: 'โครงงานไมโครคอนโทรลเลอร์',
		nameEn: 'MICROCONTROLLER PROJECT',
		credit: 1,
		group: 'core',
	},
	{
		id: '01076052',
		nameTh: 'ระบบสมองกลฝังตัวแบบเรียลไทม์',
		nameEn: 'REAL-TIME EMBEDDED SYSTEMS',
		credit: 3,
		group: 'e_hw',
	},
	{
		id: '01076053',
		nameTh: 'อินเทอร์เน็ตในทุกสิ่งและระบบอัจฉริยะ',
		nameEn: 'INTERNET OF THINGS AND SMART SYSTEMS',
		credit: 3,
		group: 'e_hw',
	},
	{
		id: '01076103',
		nameTh: 'พื้นฐานการเขียนโปรแกรมคอมพิวเตอร์',
		nameEn: 'PROGRAMMING FUNDAMENTAL',
		credit: 2,
		group: 'eng',
	},
	{
		id: '01076104',
		nameTh: 'โครงงานโปรแกรมคอมพิวเตอร์',
		nameEn: 'PROGRAMMING PROJECT',
		credit: 1,
		group: 'eng',
	},
	{
		id: '01076105',
		nameTh: 'การเขียนโปรแกรมเชิงวัตถุ',
		nameEn: 'OBJECT ORIENTED PROGRAMMING',
		credit: 2,
		group: 'core',
	},
	{
		id: '01076106',
		nameTh: 'โครงงานโปรแกรมเชิงวัตถุ',
		nameEn: 'OBJECT ORIENTED PROGRAMMING PROJECT',
		credit: 1,
		group: 'core',
	},
	{
		id: '01076109',
		nameTh: 'โครงสร้างข้อมูลเชิงวัตถุ',
		nameEn: 'OBJECT ORIENTED DATA STRUCTURES',
		credit: 3,
		group: 'core',
	},
	{
		id: '01076110',
		nameTh: 'โครงงานโครงสร้างข้อมูลเชิงวัตถุ',
		nameEn: 'OBJECT ORIENTED DATA STRUCTURES PROJECT',
		credit: 1,
		group: 'core',
	},
	{
		id: '01076112',
		nameTh: 'พื้นฐานระบบดิจิทัล',
		nameEn: 'DIGITAL SYSTEM FUNDAMENTALS',
		credit: 3,
		group: 'core',
	},
	{
		id: '01076113',
		nameTh: 'ปฏิบัติการพื้นฐานระบบดิจิทัล',
		nameEn: 'DIGITAL SYSTEM FUNDAMENTALS IN PRACTICE',
		credit: 1,
		group: 'core',
	},
	{
		id: '01076114',
		nameTh: 'องค์ประกอบและสถาปัตยกรรมคอมพิวเตอร์',
		nameEn: 'COMPUTER ORGANIZATION AND ARCHITECTURE',
		credit: 3,
		group: 'core',
	},
	{
		id: '01076115',
		nameTh: 'ปฏิบัติการองค์ประกอบคอมพิวเตอร์',
		nameEn: 'COMPUTER ORGANIZATION IN PRACTICE',
		credit: 1,
		group: 'core',
	},
	{
		id: '01076116',
		nameTh: 'เครือข่ายคอมพิวเตอร์',
		nameEn: 'COMPUTER NETWORKS',
		credit: 3,
		group: 'core',
	},
	{
		id: '01076117',
		nameTh: 'ปฏิบัติการเครือข่ายคอมพิวเตอร์',
		nameEn: 'COMPUTER NETWORKS IN PRACTICE',
		credit: 1,
		group: 'core',
	},
	{
		id: '01076118',
		nameTh: 'การดูแลแพลตฟอร์มระบบ',
		nameEn: 'SYSTEM PLATFORM ADMINISTRATION',
		credit: 3,
		group: 'core',
	},
	{
		id: '01076119',
		nameTh: 'การพัฒนาโปรแกรมบนเว็บ',
		nameEn: 'WEB APPLICATION DEVELOPMENT',
		credit: 3,
		group: 'core',
	},
	{
		id: '01076120',
		nameTh: 'โครงงานพัฒนาโปรแกรมบนเว็บ',
		nameEn: 'WEB APPLICATION DEVELOPMENT PROJECT',
		credit: 1,
		group: 'core',
	},
	{
		id: '01076121',
		nameTh: 'ทฤษฎีการคำนวณ',
		nameEn: 'THEORY OF COMPUTATION',
		credit: 3,
		group: 'core',
	},
	{ id: '01076263', nameTh: 'ระบบฐานข้อมูล', nameEn: 'DATABASE SYSTEMS', credit: 3, group: 'core' },
	{ id: '01076311', nameTh: 'โครงงาน 1', nameEn: 'PROJECT 1', credit: 3, group: 'core' },
	{ id: '01076312', nameTh: 'โครงงาน 2', nameEn: 'PROJECT 2', credit: 3, group: 'core' },
	{
		id: '01076411',
		nameTh: 'การพัฒนาหุ่นยนต์ขนาดเล็ก',
		nameEn: 'MICRO ROBOT DEVELOPMENT',
		credit: 3,
		group: 'e_hw',
	},
	{
		id: '01076414',
		nameTh: 'รถยนต์ขับเคลื่อนอัตโนมัติเบื้องต้น',
		nameEn: 'INTRODUCTION TO AUTONOMOUS VEHICLE',
		credit: 3,
		group: 'e_hw',
	},
	{
		id: '01076418',
		nameTh: 'การประมวลผลสมรรถนะสูง',
		nameEn: 'HIGH PERFORMANCE COMPUTING',
		credit: 3,
		group: 'e_hw',
	},
	{
		id: '01076420',
		nameTh: 'การออกแบบดิจิทัลขั้นสูงโดยใช้เฮชดีแอล',
		nameEn: 'ADVANCED DIGITAL DESIGN USING HDL',
		credit: 3,
		group: 'e_hw',
	},
	{
		id: '01076421',
		nameTh: 'การออกแบบระบบสมองกลฝังตัว',
		nameEn: 'EMBEDED SYSTEM DESIGN',
		credit: 3,
		group: 'e_hw',
	},
	{
		id: '01076422',
		nameTh: 'การประกอบการและการจัดการด้านเทคโนโลยีสารสนเทศ',
		nameEn: 'IT ENTREPRENEURSHIP AND MANAGEMENT',
		credit: 3,
		group: 'e_int',
	},
	{
		id: '01076423',
		nameTh: 'การวางแผนเชิงกลยุทธ์โดยใช้บอร์ดและการ์ดเกม',
		nameEn: 'STRATEGIC PLANNING USING BOARD AND CARD GAME',
		credit: 3,
		group: 'e_int',
	},
	{
		id: '01076513',
		nameTh: 'การสร้างคอมไพเลอร์',
		nameEn: 'COMPILER CONSTRUCTION',
		credit: 3,
		group: 'e_sw',
	},
	{
		id: '01076532',
		nameTh: 'การเรียนรู้ของเครื่อง',
		nameEn: 'MACHINE LEARNING',
		credit: 3,
		group: 'e_mi',
	},
	{ id: '01076533', nameTh: 'การเรียนรู้เชิงลึก', nameEn: 'DEEP LEARNING', credit: 3, group: 'e_mi' },
	{
		id: '01076558',
		nameTh: 'ไมโครเซอร์วิสและการออกแบบเรสเอพีไอ',
		nameEn: 'MICROSERVICES AND REST API DESIGN',
		credit: 3,
		group: 'e_sw',
	},
	{
		id: '01076559',
		nameTh: 'สถาปัตยกรรมและการออกแบบซอฟต์แวร์',
		nameEn: 'SOFTWARE ARCHITECTURE AND DESIGN',
		credit: 3,
		group: 'e_sw',
	},
	{
		id: '01076560',
		nameTh: 'การพัฒนาโปรแกรมบนโทรศัพท์มือถือ',
		nameEn: 'SMART MOBILE APPLICATION DEVELOPMENT',
		credit: 3,
		group: 'e_sw',
	},
	{
		id: '01076564',
		nameTh: 'การออกแบบและวิเคราะห์อัลกอริทึม',
		nameEn: 'DESIGN AND ANALYSIS OF ALGORITHMS',
		credit: 3,
		group: 'e_sw',
	},
	{ id: '01076566', nameTh: 'ระบบสื่อผสม', nameEn: 'MULTIMEDIA SYSTEMS', credit: 3, group: 'e_mm' },
	{
		id: '01076567',
		nameTh: 'การประมวลผลภาพ',
		nameEn: 'IMAGE PROCESSING',
		credit: 3,
		group: 'e_mm',
	},
	{
		id: '01076568',
		nameTh: 'การปฏิสัมพันธ์ระหว่างมนุษย์และคอมพิวเตอร์',
		nameEn: 'HUMAN COMPUTER INTERACTION',
		credit: 3,
		group: 'e_sw',
	},
	{ id: '01076574', nameTh: 'ดาตาแวร์เฮาส์', nameEn: 'DATA WAREHOUSE', credit: 3, group: 'e_bd' },
	{
		id: '01076577',
		nameTh: 'การจัดการโครงการเทคโนโลยีสารสนเทศ',
		nameEn: 'IT PROJECT MANAGEMENT',
		credit: 3,
		group: 'e_int',
	},
	{
		id: '01076582',
		nameTh: 'ปัญญาประดิษฐ์',
		nameEn: 'ARTIFICIAL INTELLIGENCE',
		credit: 3,
		group: 'e_mi',
	},
	{
		id: '01076583',
		nameTh: 'คอมพิวเตอร์กราฟิกส์',
		nameEn: 'COMPUTER GRAPHICS',
		credit: 3,
		group: 'e_mm',
	},
	{
		id: '01076584',
		nameTh: 'การจำลองระบบด้วยคอมพิวเตอร์',
		nameEn: 'COMPUTER SIMULATION',
		credit: 3,
		group: 'e_inf',
	},
	{ id: '01076585', nameTh: 'เหมืองข้อมูล', nameEn: 'DATA MINING', credit: 3, group: 'e_bd' },
	{
		id: '01076589',
		nameTh: 'ระบบฐานข้อมูลขั้นสูง',
		nameEn: 'ADVANCED DATABASE SYSTEMS',
		credit: 3,
		group: 'e_sw',
	},
	{
		id: '01076592',
		nameTh: 'ผู้ประกอบการกับวิศวกร',
		nameEn: 'ENTREPRENEURSHIP AND THE ENGINEER',
		credit: 3,
		group: 'e_int',
	},
	{
		id: '01076595',
		nameTh: 'การสืบค้นสารสนเทศและการค้นหาเว็บ',
		nameEn: 'INFORMATION STORAGE AND WEB SEARCH',
		credit: 3,
		group: 'e_mi',
	},
	{
		id: '01076596',
		nameTh: 'วิศวกรรมความต้องการของระบบ',
		nameEn: 'SYSTEM REQUIREMENTS ENGINEERING',
		credit: 3,
		group: 'e_sw',
	},
	{
		id: '01076597',
		nameTh: 'โลกเสมือนผสานโลกจริง',
		nameEn: 'AUGMENTED REALITY',
		credit: 3,
		group: 'e_mm',
	},
	{
		id: '01076598',
		nameTh: 'การวิเคราะห์ข้อมูลเบื้องต้น',
		nameEn: 'INTRODUCTION TO DATA ANALYTICS',
		credit: 3,
		group: 'e_bd',
	},
	{
		id: '01076599',
		nameTh: 'การทดสอบและการประกันคุณภาพซอฟต์แวร์',
		nameEn: 'SOFTWARE TESTING AND QUALITY ASSURANCE',
		credit: 3,
		group: 'e_sw',
	},
	{
		id: '01076627',
		nameTh: 'สถาปัตยกรรมและการบริหารความมั่นคงไอซีที',
		nameEn: 'ICT SECURITY ARCHITECTURE AND MANAGEMENT',
		credit: 3,
		group: 'e_cy',
	},
	{
		id: '01076628',
		nameTh: 'การประเมินความมั่นคงเทคโนโลยีสารสนเทศ',
		nameEn: 'INFORMATION TECHNOLOGY SECURITY ASSESSMENT',
		credit: 3,
		group: 'e_cy',
	},
	{
		id: '01076629',
		nameTh: 'การทดสอบเจาะระบบและการแฮกแบบมีจริยธรรมเบื้องต้น',
		nameEn: 'BASIC PENETRATION TESTING AND ETHICAL HACKING',
		credit: 3,
		group: 'e_cy',
	},
	{
		id: '01076631',
		nameTh: 'ซอฟต์แวร์กำหนดเครือข่าย',
		nameEn: 'SOFTWARE DEFINED NETWORKING',
		credit: 3,
		group: 'e_inf',
	},
	{
		id: '01076632',
		nameTh: 'เทคโนโลยีเครือข่ายไร้สาย',
		nameEn: 'WIRELESS NETWORK TECHNOLOGY',
		credit: 3,
		group: 'e_inf',
	},
	{
		id: '01076633',
		nameTh: 'ระบบและการบริการเสมือน',
		nameEn: 'SERVICE AND SYSTEM VIRTUALIZATION',
		credit: 3,
		group: 'e_inf',
	},
	{
		id: '01076634',
		nameTh: 'สถาปัตยกรรมข้อมูลขนาดใหญ่',
		nameEn: 'BIG DATA ARCHITECTURE',
		credit: 3,
		group: 'e_bd',
	},
	{
		id: '01076635',
		nameTh: 'เครือข่ายสวิตช์ไอพี',
		nameEn: 'IP SWITCHED NETWORKS',
		credit: 3,
		group: 'e_inf',
	},
	{
		id: '01076636',
		nameTh: 'การรุกรานความมั่นคงปลอดภัยทางไซเบอร์',
		nameEn: 'OFFENSIVE CYBER SECURITY',
		credit: 3,
		group: 'e_cy',
	},
	{
		id: '90641001',
		nameTh: 'โรงเรียนสร้างเสน่ห์',
		nameEn: 'CHARM SCHOOL',
		credit: 2,
		group: 'gen_basic',
	},
	{
		id: '90641002',
		nameTh: 'ความฉลาดทางดิจิทัล',
		nameEn: 'DIGITAL INTELLIGENCE QUOTIENT',
		credit: 3,
		group: 'gen_basic',
	},
	{
		id: '90641003',
		nameTh: 'กีฬาและนันทนาการ',
		nameEn: 'SPORTS AND RECREATIONAL ACTIVITIES',
		credit: 1,
		group: 'gen_basic',
	},
	{
		id: '90644007',
		nameTh: 'ภาษาอังกฤษพื้นฐาน 1',
		nameEn: 'FOUNDATION ENGLISH 1',
		credit: 3,
		group: 'gen_lang',
	},
	{
		id: '90644008',
		nameTh: 'ภาษาอังกฤษพื้นฐาน 2',
		nameEn: 'FOUNDATION ENGLISH 2',
		credit: 3,
		group: 'gen_lang',
	},
]

// Major-elective sub-area groups (children of "กลุ่มวิชาเลือกเฉพาะสาขา").
const ELECTIVES: { key: string; name: string }[] = [
	{ key: 'e_hw', name: 'เลือกสาขาฮาร์ดแวร์และสถาปัตยกรรมคอมพิวเตอร์' },
	{ key: 'e_sw', name: 'เลือกสาขาการพัฒนาซอฟต์แวร์' },
	{ key: 'e_bd', name: 'เลือกสาขาข้อมูลขนาดใหญ่และธุรกิจอัจฉริยะ' },
	{ key: 'e_mm', name: 'เลือกสาขาการประมวลผลมัลติมีเดีย' },
	{ key: 'e_mi', name: 'เลือกสาขาเครื่องจักรอัจฉริยะ' },
	{ key: 'e_cy', name: 'เลือกสาขาความปลอดภัยไซเบอร์' },
	{ key: 'e_inf', name: 'เลือกสาขาโครงสร้างพื้นฐานของระบบ' },
	{ key: 'e_int', name: 'เลือกสาขาวิชาบูรณาการ' },
]

// group key -> the curriculum_group.name it maps to (for resolving ids).
const GROUP_NAME: Record<string, string> = {
	eng: 'กลุ่มวิชาวิศวกรรมพื้นฐาน',
	core: 'กลุ่มวิชาวิศวกรรมคอมพิวเตอร์พื้นฐาน',
	gen_basic: 'วิชาพื้นฐาน',
	gen_lang: 'วิชาด้านภาษาและการสื่อสาร',
	e_hw: 'เลือกสาขาฮาร์ดแวร์และสถาปัตยกรรมคอมพิวเตอร์',
	e_sw: 'เลือกสาขาการพัฒนาซอฟต์แวร์',
	e_bd: 'เลือกสาขาข้อมูลขนาดใหญ่และธุรกิจอัจฉริยะ',
	e_mm: 'เลือกสาขาการประมวลผลมัลติมีเดีย',
	e_mi: 'เลือกสาขาเครื่องจักรอัจฉริยะ',
	e_cy: 'เลือกสาขาความปลอดภัยไซเบอร์',
	e_inf: 'เลือกสาขาโครงสร้างพื้นฐานของระบบ',
	e_int: 'เลือกสาขาวิชาบูรณาการ',
}

async function main() {
	console.log('🌱 seeding CE (Continuing) curriculum…')

	// 1. Subjects — upsert.
	await db
		.insert(schema.subject)
		.values(SUBJECTS.map(({ id, nameTh, nameEn, credit }) => ({ id, nameTh, nameEn, credit })))
		.onConflictDoUpdate({
			target: schema.subject.id,
			set: {
				nameTh: sql`excluded.name_th`,
				nameEn: sql`excluded.name_en`,
				credit: sql`excluded.credit`,
			},
		})

	// 2. Structure — create once.
	const existing = await db
		.select({ id: schema.program.id })
		.from(schema.program)
		.where(eq(schema.program.nameEn, 'Computer Engineering (Continuing)'))
		.limit(1)

	if (!existing.length) {
		const [dept] = await db
			.select()
			.from(schema.department)
			.where(eq(schema.department.nameEn, 'Computer Engineering'))
			.limit(1)
		const [prog] = await db
			.insert(schema.program)
			.values({
				departmentId: dept?.id ?? null,
				kmitlId: '010102',
				nameTh: 'วิศวกรรมคอมพิวเตอร์ (ต่อเนื่อง)',
				nameEn: 'Computer Engineering (Continuing)',
			})
			.returning()
		const g = async (v: typeof schema.curriculumGroup.$inferInsert) =>
			(await db.insert(schema.curriculumGroup).values(v).returning())[0]!.id
		const root = await g({
			parentId: null,
			type: 'root',
			name: 'หลักสูตร วศ.บ. วิศวกรรมคอมพิวเตอร์ (ต่อเนื่อง) ปป.64',
			credit: 114,
			color: '#2563eb',
		})
		const gen = await g({
			parentId: root,
			type: 'category',
			name: 'หมวดวิชาศึกษาทั่วไป',
			credit: 30,
			color: '#0891b2',
		})
		for (const [name, credit] of [
			['วิชาพื้นฐาน', 6],
			['วิชาด้านภาษาและการสื่อสาร', 9],
			['วิชาตามเกณฑ์ของคณะ', 9],
			['วิชาเลือก', 6],
		] as const)
			await g({ parentId: gen, type: 'subgroup', name, credit })
		const major = await g({
			parentId: root,
			type: 'category',
			name: 'หมวดวิชาเฉพาะ',
			credit: 78,
			color: '#2563eb',
		})
		await g({ parentId: major, type: 'subgroup', name: 'กลุ่มวิชาวิศวกรรมพื้นฐาน', credit: 8 })
		await g({ parentId: major, type: 'subgroup', name: 'กลุ่มวิชาวิศวกรรมคอมพิวเตอร์พื้นฐาน', credit: 58 })
		const elec = await g({
			parentId: major,
			type: 'subgroup',
			name: 'กลุ่มวิชาเลือกเฉพาะสาขา',
			credit: 12,
		})
		for (const e of ELECTIVES) await g({ parentId: elec, type: 'elective', name: e.name })
		await g({
			parentId: root,
			type: 'category',
			name: 'หมวดวิชาเลือกเสรี',
			credit: 6,
			color: '#64748b',
		})
		await db.insert(schema.curriculum).values({
			programId: prog!.id,
			groupId: root,
			year: 2564,
			nameTh: 'หลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมคอมพิวเตอร์ (ต่อเนื่อง)',
			nameEn: 'Bachelor of Engineering in Computer Engineering (Continuing)',
		})
	}

	// 3. group↔subject links — resolve group ids by name, add any that are missing.
	const names = [...new Set(SUBJECTS.map((s) => GROUP_NAME[s.group]!))]
	const grows = await db
		.select({ id: schema.curriculumGroup.id, name: schema.curriculumGroup.name })
		.from(schema.curriculumGroup)
		.where(inArray(schema.curriculumGroup.name, names))
	const nameToId = new Map(grows.map((r) => [r.name, r.id]))
	const have = new Set(
		(
			await db
				.select({
					g: schema.curriculumGroupSubject.groupId,
					s: schema.curriculumGroupSubject.subjectId,
				})
				.from(schema.curriculumGroupSubject)
				.where(
					inArray(
						schema.curriculumGroupSubject.subjectId,
						SUBJECTS.map((s) => s.id),
					),
				)
		).map((l) => `${l.g}:${l.s}`),
	)
	const toAdd = SUBJECTS.map((s) => ({
		groupId: nameToId.get(GROUP_NAME[s.group]!),
		subjectId: s.id,
	})).filter(
		(l): l is { groupId: number; subjectId: string } =>
			!!l.groupId && !have.has(`${l.groupId}:${l.subjectId}`),
	)
	if (toAdd.length) await db.insert(schema.curriculumGroupSubject).values(toAdd)

	console.log(`✅ CE (Continuing): ${SUBJECTS.length} subjects, +${toAdd.length} links`)
	process.exit(0)
}

main().catch((err) => {
	console.error('❌ CE curriculum seed failed:', err)
	process.exit(1)
})
