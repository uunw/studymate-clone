/**
 * Whether a section's เงื่อนไข (registrar rule_th) admits a given 8-digit student
 * id. The registrar restricts free electives mostly by student-id range/set
 * (e.g. "เฉพาะรหัสนักศึกษาในช่วง 69010001 - 69015999", "เฉพาะรหัสนักศึกษา 65010211")
 * and/or by major.
 *
 * Open when: no rule; OR a student-id range/single that matches the id. A rule
 * that only restricts by major/curriculum (no id constraint) is treated as open
 * — the student's major can't be matched against the free-text สาขา reliably, so
 * we don't hide on that signal (it stays flagged in the UI instead).
 */
export function isSectionOpenToStudent(
	rule: string | null | undefined,
	studentId: number,
): boolean {
	if (!rule?.trim()) return true
	if (!Number.isFinite(studentId)) return true

	// id ranges: "A - B" (8-digit). Open if the id falls in any range.
	const ranges = [...rule.matchAll(/(\d{8})\s*[-–—]\s*(\d{8})/g)]
	if (ranges.length) {
		return ranges.some((m) => studentId >= Number(m[1]) && studentId <= Number(m[2]))
	}
	// explicit single id(s): "เฉพาะรหัสนักศึกษา 65010211[, ...]"
	if (/รหัส\s*นักศึกษา|รหัสนศ/.test(rule)) {
		const singles = [...rule.matchAll(/\b(\d{8})\b/g)].map((m) => Number(m[1]))
		if (singles.length) return singles.includes(studentId)
	}
	// a non-id (major-only) restriction — can't verify; treat as open.
	return true
}

/** A rule that imposes any registration condition at all (for UI flagging). */
export function hasCondition(rule: string | null | undefined): boolean {
	return !!rule?.trim()
}
