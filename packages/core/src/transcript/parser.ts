import { SUBJECT_ID_RE, VALID_GRADES } from '../constants'

export type ParsedRow = {
	subjectId: string
	grade: string
	credit: number | null
	year: number | null
	term: number | null
}

// Grades ordered longest-first so "B+" wins over "B" when matching.
const GRADE_ALT = [...VALID_GRADES, 'W', 'WS']
	.sort((a, b) => b.length - a.length)
	.map((g) => g.replace('+', '\\+'))
	.join('|')

// A row line: 8-digit code … optional credit … trailing grade token.
const ROW_RE = new RegExp(
	`(?<code>\\d{8})\\b.*?(?:\\s(?<credit>\\d(?:\\.\\d)?)\\s)?\\s*(?<grade>${GRADE_ALT})\\s*$`,
)

// Header lines that scope the following rows to a year/term.
//  Thai:    "ภาคการศึกษาที่ 1 ปีการศึกษา 2566"  (term then year)
//  English: "Semester 1 / 2566" or "First Semester 2566"
const TH_HEADER_RE = /ภาคการศึกษาที่\s*(\d).*?(?:25\d{2}|20\d{2})/
const TH_YEAR_RE = /(?:25\d{2}|20\d{2})/
const EN_HEADER_RE = /semester\s*(\d)\s*[/-]?\s*((?:25|20)\d{2})/i
const EN_WORD_HEADER_RE = /\b(first|second|third)\s+semester\b.*?((?:25|20)\d{2})/i
const WORD_TERM: Record<string, number> = { first: 1, second: 2, third: 3 }

/**
 * Best-effort port of the original C# (UglyToad.PdfPig) transcript parser.
 * Pure + line-oriented so it can be unit-tested without a real PDF.
 *
 * Scans top-to-bottom: header lines update the "current" (year, term); any line
 * carrying an 8-digit subject code + a trailing grade becomes a row stamped with
 * the current year/term.
 */
export function parseTranscriptText(text: string): ParsedRow[] {
	const rows: ParsedRow[] = []
	let year: number | null = null
	let term: number | null = null

	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trim()
		if (!line) continue

		// --- header detection ---
		const en = EN_HEADER_RE.exec(line)
		if (en) {
			term = Number(en[1])
			year = Number(en[2])
			continue
		}
		const enWord = EN_WORD_HEADER_RE.exec(line)
		if (enWord) {
			term = WORD_TERM[enWord[1]!.toLowerCase()] ?? null
			year = Number(enWord[2])
			continue
		}
		const th = TH_HEADER_RE.exec(line)
		if (th) {
			term = Number(th[1])
			year = Number(TH_YEAR_RE.exec(line)?.[0] ?? '') || null
			continue
		}

		// --- row detection ---
		const m = ROW_RE.exec(line)
		if (m?.groups) {
			const { code, grade, credit } = m.groups
			if (code && grade && SUBJECT_ID_RE.test(code)) {
				rows.push({
					subjectId: code,
					grade: grade.toUpperCase(),
					credit: credit ? Number(credit) : null,
					year,
					term,
				})
			}
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
