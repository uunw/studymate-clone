import { SUBJECT_ID_RE } from '../constants'

export type ParsedRow = {
	subjectId: string
	nameEn: string | null
	grade: string
	credit: number | null
	year: number | null
	term: number | null
}

// A subject cell: 8-digit code, name (which must NOT contain another code),
// single-digit credit, grade (normal A..F/S/U/W or transfer T(x)). Global so a
// two-column line — or unpdf's single-line dump — yields every cell.
const ROW_RE = /(\d{8})\s+((?:(?!\d{8}).)+?)\s+([1-9])\s+(T\([A-Z][+]?\)|[A-F][+]?|S|U|W)(?=\s|$)/g

// Term/semester headers (collected by position, since unpdf strips newlines):
//  English: "1st Semester, Year, 2024-2025"  ·  "Semester 1 / 2566"  ·  "First Semester 2566"
//  Thai:    "ภาคการศึกษาที่ 1 ปีการศึกษา 2566"
const EN_ORD_G = /(\d)(?:st|nd|rd|th)\s+Semester[^\n]*?((?:19|20|25)\d{2})/gi
const EN_NUM_G = /\bSemester\s*(\d)\s*[/-]?\s*((?:25|20)\d{2})/gi
const EN_WORD_G = /\b(first|second|third)\s+Semester\b[^\n]*?((?:25|20)\d{2})/gi
const TH_G = /ภาคการศึกษาที่\s*(\d)[^\n]*?((?:25|20)\d{2})/g
const WORD_TERM: Record<string, number> = { first: 1, second: 2, third: 3 }

/** Gregorian academic-start year → Buddhist year (KMITL uses พ.ศ.). */
const toBuddhist = (y: number) => (y < 2500 ? y + 543 : y)
const normGrade = (g: string) => (g.startsWith('T(') ? 'T' : g.toUpperCase())

type Header = { index: number; term: number; year: number }

function collectHeaders(text: string): Header[] {
	const hs: Header[] = []
	const add = (re: RegExp, term: (m: RegExpExecArray) => number) => {
		re.lastIndex = 0
		for (let m = re.exec(text); m; m = re.exec(text)) {
			hs.push({ index: m.index, term: term(m), year: toBuddhist(Number(m[2])) })
		}
	}
	add(EN_ORD_G, (m) => Number(m[1]))
	add(EN_NUM_G, (m) => Number(m[1]))
	add(EN_WORD_G, (m) => WORD_TERM[m[1]!.toLowerCase()] ?? 0)
	add(TH_G, (m) => Number(m[1]))
	return hs.sort((a, b) => a.index - b.index)
}

/**
 * Parse a KMITL transcript's plain text into graded course rows. Position-based
 * (not line-based) so it works whether the extractor preserves layout
 * (pdftotext) or flattens everything onto one line (unpdf/pdf.js). Handles the
 * official English transcript (two-column, transfer T(grade) cells, Gregorian
 * academic years) and the older Thai layout.
 */
export function parseTranscriptText(text: string): ParsedRow[] {
	const headers = collectHeaders(text)
	const rows: ParsedRow[] = []

	ROW_RE.lastIndex = 0
	for (let m = ROW_RE.exec(text); m; m = ROW_RE.exec(text)) {
		const [, code, name, credit, grade] = m
		if (!code || !grade || !SUBJECT_ID_RE.test(code)) continue

		// term in effect = the last header positioned before this row
		let cur: Header | undefined
		for (const h of headers) {
			if (h.index < m.index) cur = h
			else break
		}

		rows.push({
			subjectId: code,
			nameEn: name?.trim() || null,
			grade: normGrade(grade),
			credit: credit ? Number(credit) : null,
			year: cur?.year ?? null,
			term: cur?.term ?? null,
		})
	}

	return dedupeRows(rows)
}

/** Keep the last grade seen per (subject, year, term) — re-takes override. */
function dedupeRows(rows: ParsedRow[]): ParsedRow[] {
	const byKey = new Map<string, ParsedRow>()
	for (const r of rows) byKey.set(`${r.subjectId}:${r.year}:${r.term}`, r)
	return [...byKey.values()]
}
