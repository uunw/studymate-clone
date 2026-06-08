import { SUBJECT_ID_RE } from '../constants'

export type ParsedRow = {
	subjectId: string
	nameEn: string | null
	grade: string
	credit: number | null
	year: number | null
	term: number | null
}

// A subject cell: 8-digit code, name (must NOT contain another code), single-
// digit credit, grade (normal A..F/S/U/W or transfer T(x)). Global so a line
// with two cells (some layouts) yields both.
const ROW_RE = /(\d{8})\s+((?:(?!\d{8}).)+?)\s+([1-9])\s+(T\([A-Z][+]?\)|[A-F][+]?|S|U|W)(?=\s|$)/g

// Term/semester headers.
//  English: "1st Semester, Year, 2024-2025"  ·  "Semester 1 / 2566"  ·  "First Semester 2566"
//  Thai:    "ภาคการศึกษาที่ 1 ปีการศึกษา 2566"
const EN_ORD = /(\d)(?:st|nd|rd|th)\s+Semester[^\n]*?((?:19|20|25)\d{2})/i
const EN_NUM = /\bSemester\s*(\d)\s*[/-]?\s*((?:25|20)\d{2})/i
const EN_WORD = /\b(first|second|third)\s+Semester\b[^\n]*?((?:25|20)\d{2})/i
const TH = /ภาคการศึกษาที่\s*(\d)[^\n]*?((?:25|20)\d{2})/
const WORD_TERM: Record<string, number> = { first: 1, second: 2, third: 3 }

// A bare name continuation (a wrapped subject name): letters only, no code,
// and not one of the transcript's structural/summary lines.
const NAME_CONT = /^[A-Za-z][A-Za-z\s&.'/-]*$/
const STOP =
	/\b(GPA|GPS|GRADE|CREDIT|TOTAL|TRANSCRIPT|CONTINUE|COURSE|SEMESTER|CUMULATIVE|CHECKED|ISSUED|UNOFFICIAL|DOCUMENT|PHOTO|STUDENT|DEGREE|PROGRAM|ADMISSION|GRADUATION|BACHELOR|EARNED)\b/i

const toBuddhist = (y: number) => (y < 2500 ? y + 543 : y)
const normGrade = (g: string) => (g.startsWith('T(') ? 'T' : g.toUpperCase())

function detectHeader(line: string): { term: number; year: number } | null {
	let m = EN_ORD.exec(line)
	if (m) return { term: Number(m[1]), year: toBuddhist(Number(m[2])) }
	m = EN_NUM.exec(line)
	if (m) return { term: Number(m[1]), year: toBuddhist(Number(m[2])) }
	m = EN_WORD.exec(line)
	if (m) return { term: WORD_TERM[m[1]!.toLowerCase()] ?? 0, year: toBuddhist(Number(m[2])) }
	m = TH.exec(line)
	if (m) return { term: Number(m[1]), year: toBuddhist(Number(m[2])) }
	return null
}

/**
 * Parse a KMITL transcript's (column-aware) plain text into graded course rows.
 * Handles the official English transcript — two-column, transfer T(grade) cells,
 * "Nst Semester, Year, YYYY-YYYY" headers, names that wrap onto the next line —
 * and the older Thai layout.
 */
export function parseTranscriptText(text: string): ParsedRow[] {
	const rows: ParsedRow[] = []
	let year: number | null = null
	let term: number | null = null
	let last: ParsedRow | null = null

	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trim()
		if (!line) continue

		const h = detectHeader(line)
		if (h && !/\d{8}/.test(line)) {
			year = h.year
			term = h.term
			last = null
			continue
		}

		// subject cell(s)
		ROW_RE.lastIndex = 0
		let matched = false
		for (let m = ROW_RE.exec(line); m; m = ROW_RE.exec(line)) {
			const [, code, name, credit, grade] = m
			if (!code || !grade || !SUBJECT_ID_RE.test(code)) continue
			matched = true
			last = {
				subjectId: code,
				nameEn: name?.trim() || null,
				grade: normGrade(grade),
				credit: credit ? Number(credit) : null,
				year,
				term,
			}
			rows.push(last)
		}
		if (matched) continue

		// wrapped-name continuation → append to the most recent row's name
		if (last?.nameEn && NAME_CONT.test(line) && !STOP.test(line)) {
			last.nameEn = `${last.nameEn} ${line}`.replace(/\s+/g, ' ').trim()
		}
	}

	return dedupeRows(rows)
}

/** Keep the last grade seen per (subject, year, term) — re-takes override. */
function dedupeRows(rows: ParsedRow[]): ParsedRow[] {
	const byKey = new Map<string, ParsedRow>()
	for (const r of rows) byKey.set(`${r.subjectId}:${r.year}:${r.term}`, r)
	return [...byKey.values()]
}
