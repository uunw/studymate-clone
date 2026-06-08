import { db, eq, schema, sql } from './index'

/**
 * Import the academic hierarchy + subject offerings from KMITL's public
 * registrar API (https://api.reg.kmitl.ac.th + the teach-table endpoint on
 * regis.reg.kmitl.ac.th). Far cleaner than the curriculum PDF: proper Thai,
 * real ids, credits, and per-section teach tables.
 *
 * Scope: all faculties + departments (cheap), then programs + subjects +
 * sections for one faculty (default 01 = Engineering) for the current term.
 *   FACULTY=01 pnpm --filter @repo/db import:regis
 *
 * Be polite — requests are pooled at low concurrency. Idempotent: everything
 * upserts on its natural key.
 */
const API = 'https://api.reg.kmitl.ac.th'
const REGIS = 'https://regis.reg.kmitl.ac.th/api'
const LEVEL = '1' // bachelor
const FACULTY = process.env.FACULTY ?? '01'
const CONCURRENCY = 4

async function getJson<T>(url: string, tries = 3): Promise<T> {
	for (let i = 0; i < tries; i++) {
		try {
			const ctrl = new AbortController()
			const to = setTimeout(() => ctrl.abort(), 60_000)
			const res = await fetch(url, { signal: ctrl.signal })
			clearTimeout(to)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			return (await res.json()) as T
		} catch (err) {
			if (i === tries - 1) throw err
			await sleep(500 * (i + 1))
		}
	}
	throw new Error('unreachable')
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const stripHtml = (s?: string | null) =>
	(s ?? '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim() || null
const num = (v: unknown) => {
	const n = Number(v)
	return Number.isFinite(n) ? n : null
}

async function pool<T>(items: T[], limit: number, fn: (t: T, i: number) => Promise<void>) {
	let idx = 0
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (idx < items.length) {
			const i = idx++
			await fn(items[i]!, i)
		}
	})
	await Promise.all(workers)
}

type Faculty = { faculty_id: string; faculty_name_th: string; faculty_name_en: string }
type Dept = {
	faculty_id: string
	department_id: string
	department_name_th: string
	department_name_en: string
}
type Curr = {
	faculty_id: string
	dept_id: string
	curriculum_id: string
	curriculum_name_th: string
	curriculum_name_en: string
}
type Section = {
	teach_table_id: string
	subject_id: string
	subject_name_th: string
	subject_name_en: string
	credit: string
	section: string
	lect_or_prac: string
	teach_day: string
	teach_time: string
	teach_time2: string
	classroom: string | null
	room_no: string | null
	classbuilding: string | null
	building_no: string | null
	teacher_list_th: string | null
	teacher_list_en: string | null
	limit: string | number | null
	count: number | null
	closed: string | null
	midterm_start_date_time: string | null
	final_start_date_time: string | null
	rules_th: string | null
	remark: string | null
}
type Block = { department_id: string; curriculum2_id: string; teachtable: { data: Section[] }[] }

async function main() {
	console.log(`🌐 importing from KMITL registrar API (faculty ${FACULTY})…`)

	const term = await getJson<{ YEAR: string; SEMESTER: string }>(
		`${REGIS}/?function=get-year-semester-now&level_id=${LEVEL}`,
	)
	const year = Number(term.YEAR)
	const semester = Number(term.SEMESTER)
	console.log(`   term: ${year}/${semester}`)

	// 1. Faculties + departments (whole institute — cheap).
	const faculties = await getJson<Faculty[]>(`${API}/faculty/?function=get-registrar-faculty`)
	await db
		.insert(schema.faculty)
		.values(
			faculties.map((f) => ({
				kmitlId: f.faculty_id,
				nameTh: f.faculty_name_th,
				nameEn: f.faculty_name_en,
			})),
		)
		.onConflictDoUpdate({
			target: schema.faculty.kmitlId,
			set: { nameTh: sql`excluded.name_th`, nameEn: sql`excluded.name_en` },
		})
	const facId = new Map(
		(
			await db.select({ id: schema.faculty.id, k: schema.faculty.kmitlId }).from(schema.faculty)
		).map((r) => [r.k, r.id]),
	)

	const depts = await getJson<Dept[]>(`${API}/department/?function=get-registrar-department`)
	await db
		.insert(schema.department)
		.values(
			depts.map((d) => ({
				facultyId: facId.get(d.faculty_id) ?? null,
				kmitlId: d.department_id,
				nameTh: d.department_name_th,
				nameEn: d.department_name_en,
			})),
		)
		.onConflictDoUpdate({
			target: [schema.department.facultyId, schema.department.kmitlId],
			set: { nameTh: sql`excluded.name_th`, nameEn: sql`excluded.name_en` },
		})
	const deptId = new Map(
		(
			await db
				.select({
					id: schema.department.id,
					f: schema.department.facultyId,
					k: schema.department.kmitlId,
				})
				.from(schema.department)
		).map((r) => [`${r.f}:${r.k}`, r.id]),
	)
	console.log(`   ✔ ${faculties.length} faculties, ${depts.length} departments`)

	// 2. Programs (curricula) for the target faculty.
	const myDepts = depts.filter((d) => d.faculty_id === FACULTY)
	const facDbId = facId.get(FACULTY)
	const curricula: Curr[] = []
	await pool(myDepts, CONCURRENCY, async (d) => {
		const cs = await getJson<Curr[]>(
			`${API}/curriculum/?function=get-registrar-curriculum&level_id=${LEVEL}&faculty_id=${FACULTY}&department_id=${d.department_id}`,
		).catch(() => [])
		curricula.push(...cs)
	})
	if (curricula.length) {
		await db
			.insert(schema.program)
			.values(
				curricula.map((c) => ({
					departmentId: deptId.get(`${facDbId}:${c.dept_id}`) ?? null,
					kmitlId: c.curriculum_id,
					nameTh: c.curriculum_name_th,
					nameEn: c.curriculum_name_en,
				})),
			)
			.onConflictDoUpdate({
				target: [schema.program.departmentId, schema.program.kmitlId],
				set: { nameTh: sql`excluded.name_th`, nameEn: sql`excluded.name_en` },
			})
	}
	const progId = new Map(
		(
			await db
				.select({
					id: schema.program.id,
					d: schema.program.departmentId,
					k: schema.program.kmitlId,
				})
				.from(schema.program)
		).map((r) => [`${r.d}:${r.k}`, r.id]),
	)
	console.log(`   ✔ ${curricula.length} programs (faculty ${FACULTY})`)

	// teachtable for this term (single row).
	await db.insert(schema.teachtable).values({ year, term: semester }).onConflictDoNothing()
	const [tt] = await db
		.select({ id: schema.teachtable.id })
		.from(schema.teachtable)
		.where(eq(schema.teachtable.year, year))
		.limit(1)
	const teachtableId = tt!.id

	// 3. Subjects + sections per curriculum.
	let subjN = 0
	let secN = 0
	const seenSubj = new Set<string>()
	await pool(curricula, CONCURRENCY, async (c) => {
		const url =
			`${REGIS}/?function=get-teach-table-show&mode=by_class&selected_year=${year}` +
			`&selected_semester=${semester}&selected_faculty=${FACULTY}&selected_department=${c.dept_id}` +
			`&selected_curriculum=${c.curriculum_id}&selected_class_year=1` +
			`&search_all_faculty=false&search_all_department=false&search_all_curriculum=false&search_all_class_year=true`
		const blocks = await getJson<Block[]>(url).catch(() => [])
		const pid = progId.get(`${deptId.get(`${facDbId}:${c.dept_id}`)}:${c.curriculum_id}`) ?? null

		const subjRows = new Map<string, typeof schema.subject.$inferInsert>()
		const secRows: (typeof schema.subjectClass.$inferInsert)[] = []
		for (const b of blocks) {
			for (const grp of b.teachtable) {
				for (const it of grp.data) {
					subjRows.set(it.subject_id, {
						id: it.subject_id,
						nameTh: it.subject_name_th,
						nameEn: it.subject_name_en,
						credit: num(it.credit),
					})
					secRows.push({
						id: it.teach_table_id,
						subjectId: it.subject_id,
						teachtableId,
						programId: pid,
						section: it.section ?? null,
						lectOrPrac: it.lect_or_prac ?? null,
						day: num(it.teach_day),
						timeStart: it.teach_time ?? null,
						timeEnd: it.teach_time2 ?? null,
						room: it.room_no ?? it.classroom ?? null,
						building: it.building_no ?? it.classbuilding ?? null,
						teacherTh: stripHtml(it.teacher_list_th),
						teacherEn: stripHtml(it.teacher_list_en),
						capacity: num(it.limit),
						enrolled: num(it.count),
						closed: it.closed === '1',
						examMidterm: it.midterm_start_date_time ?? null,
						examFinal: it.final_start_date_time ?? null,
						ruleTh: stripHtml(it.rules_th),
						remark: stripHtml(it.remark),
					})
				}
			}
		}
		if (subjRows.size) {
			await db
				.insert(schema.subject)
				.values([...subjRows.values()])
				.onConflictDoUpdate({
					target: schema.subject.id,
					set: {
						nameTh: sql`excluded.name_th`,
						nameEn: sql`excluded.name_en`,
						credit: sql`excluded.credit`,
					},
				})
			for (const k of subjRows.keys()) seenSubj.add(k)
		}
		if (secRows.length) {
			// de-dupe by teach_table_id within this batch (a section can appear in multiple class blocks)
			const uniq = [...new Map(secRows.map((r) => [r.id, r])).values()]
			await db
				.insert(schema.subjectClass)
				.values(uniq)
				.onConflictDoUpdate({
					target: schema.subjectClass.id,
					set: {
						programId: sql`excluded.program_id`,
						section: sql`excluded.section`,
						capacity: sql`excluded.capacity`,
						enrolled: sql`excluded.enrolled`,
						closed: sql`excluded.closed`,
						examMidterm: sql`excluded.exam_midterm`,
						examFinal: sql`excluded.exam_final`,
						ruleTh: sql`excluded.rule_th`,
						remark: sql`excluded.remark`,
					},
				})
			secN += uniq.length
		}
	})
	subjN = seenSubj.size
	console.log(
		`✅ imported ${subjN} subjects, ${secN} sections for faculty ${FACULTY} (${year}/${semester})`,
	)
	process.exit(0)
}

main().catch((err) => {
	console.error('❌ regis import failed:', err)
	process.exit(1)
})
