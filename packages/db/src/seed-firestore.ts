// One-off migration: copy academic reference data Postgres → Firestore.
// Run: pnpm --filter @repo/db seed:firestore  (needs .env DATABASE_URL + the
// gitignored .firebase-admin-key.json service-account key at the repo root).
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { cert, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { db } from './client'
import * as schema from './schema'

const keyPath = fileURLToPath(new URL('../../../.firebase-admin-key.json', import.meta.url))
const app = initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) })
const fs = getFirestore(app)
fs.settings({ ignoreUndefinedProperties: true })

type Doc = { col: string; id: string; data: Record<string, unknown> }

async function commitInChunks(docs: Doc[]) {
	for (let i = 0; i < docs.length; i += 450) {
		const batch = fs.batch()
		for (const d of docs.slice(i, i + 450)) batch.set(fs.collection(d.col).doc(d.id), d.data)
		await batch.commit()
		process.stdout.write(`  ${Math.min(i + 450, docs.length)}/${docs.length}\r`)
	}
	process.stdout.write('\n')
}

const tokenize = (...parts: (string | null)[]) =>
	[
		...new Set(
			parts
				.filter(Boolean)
				.join(' ')
				.toLowerCase()
				.split(/[\s/().,-]+/)
				.filter((t) => t.length >= 2),
		),
	].slice(0, 30)

async function main() {
	const [faculties, departments, programs, curricula, subjects, teachtables, sections] =
		await Promise.all([
			db.select().from(schema.faculty),
			db.select().from(schema.department),
			db.select().from(schema.program),
			db.select().from(schema.curriculum),
			db.select().from(schema.subject),
			db.select().from(schema.teachtable),
			db.select().from(schema.subjectClass),
		])

	// Current term = latest teachtable; denormalize offered days + open-section count.
	const cur = [...teachtables].sort((a, b) => b.year - a.year || b.term - a.term)[0]
	const ttId = cur?.id ?? -1
	const offeredDays = new Map<string, Set<number>>()
	const openSections = new Map<string, number>()
	for (const s of sections) {
		if (s.teachtableId !== ttId || !s.subjectId) continue
		openSections.set(s.subjectId, (openSections.get(s.subjectId) ?? 0) + 1)
		if (s.day != null) {
			const set = offeredDays.get(s.subjectId) ?? new Set<number>()
			set.add(s.day)
			offeredDays.set(s.subjectId, set)
		}
	}

	const docs: Doc[] = []
	for (const f of faculties) docs.push({ col: 'faculties', id: String(f.id), data: f })
	for (const d of departments) docs.push({ col: 'departments', id: String(d.id), data: d })
	for (const p of programs) docs.push({ col: 'programs', id: String(p.id), data: p })
	for (const c of curricula) docs.push({ col: 'curricula', id: String(c.id), data: c })
	for (const t of teachtables) docs.push({ col: 'teachtables', id: String(t.id), data: t })
	for (const sc of sections) docs.push({ col: 'sections', id: String(sc.id), data: sc })
	for (const s of subjects) {
		docs.push({
			col: 'subjects',
			id: s.id,
			data: {
				...s,
				ratingAvg: 0,
				reviewCount: 0,
				searchTokens: tokenize(s.id, s.nameTh, s.nameEn),
				offeredDays: [...(offeredDays.get(s.id) ?? [])].sort((a, b) => a - b),
				openSections: openSections.get(s.id) ?? 0,
			},
		})
	}

	console.log(
		`seeding Firestore: ${faculties.length} faculties, ${departments.length} departments, ` +
			`${programs.length} programs, ${curricula.length} curricula, ${subjects.length} subjects, ` +
			`${sections.length} sections, ${teachtables.length} teachtables (${docs.length} docs)`,
	)
	await commitInChunks(docs)
	console.log('done')
}

main()
	.then(() => process.exit(0))
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
