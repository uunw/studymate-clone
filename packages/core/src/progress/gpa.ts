import { GRADE_POINTS } from '../constants'

/** A graded course with its term. year/term null = transfer credit. */
export type TermGrade = {
	grade: string
	credit: number
	year: number | null
	term: number | null
}

export type TermStat = {
	key: string
	year: number | null
	term: number | null
	gps: number // this term's GPA
	gpa: number // cumulative GPA through this term
	credits: number // GPA-bearing credits this term
	items: TermGrade[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Per-term GPS and running cumulative GPA, chronologically. Mirrors the original
 * grade-tracker: S/U/T/W carry no grade point and are skipped; F counts as 0.
 * Transfer rows (null year) sort last and contribute nothing to GPA.
 */
export function termGpa(details: readonly TermGrade[]): { terms: TermStat[]; finalGpa: number } {
	const groups = new Map<string, TermStat>()
	for (const d of details) {
		const key = d.year != null && d.term != null ? `${d.year}-${d.term}` : 'transfer'
		const g = groups.get(key)
		if (g) g.items.push(d)
		else
			groups.set(key, { key, year: d.year, term: d.term, gps: 0, gpa: 0, credits: 0, items: [d] })
	}

	const terms = [...groups.values()].sort((a, b) => {
		const rank = (t: TermStat) =>
			t.year == null ? Number.POSITIVE_INFINITY : t.year * 10 + (t.term ?? 0)
		return rank(a) - rank(b)
	})

	let cumPoints = 0
	let cumCredits = 0
	let finalGpa = 0
	for (const t of terms) {
		let points = 0
		let credits = 0
		for (const d of t.items) {
			const gp = GRADE_POINTS[d.grade.toUpperCase().trim()]
			if (gp == null) continue
			points += gp * d.credit
			credits += d.credit
		}
		t.credits = credits
		t.gps = credits > 0 ? round2(points / credits) : 0
		cumPoints += points
		cumCredits += credits
		t.gpa = cumCredits > 0 ? round2(cumPoints / cumCredits) : 0
		if (credits > 0) finalGpa = t.gpa
	}

	return { terms, finalGpa }
}
