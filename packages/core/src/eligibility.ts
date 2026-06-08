/** The student's curriculum context, for matching against a section's เงื่อนไข. */
export type StudentContext = {
	/** Distinctive major token, e.g. 'คอมพิวเตอร์' (from the program/department name). */
	major?: string
	/** Faculty name, e.g. 'วิศวกรรมศาสตร์'. */
	faculty?: string
}

/**
 * Whether a section's เงื่อนไข (registrar rule_th) admits a given student.
 *
 * The registrar restricts free electives by:
 *  - student-id range/set — "เฉพาะรหัสนักศึกษาในช่วง 69010001 - 69015999",
 *    "เฉพาะรหัสนักศึกษา 65010211" — checked against the 8-digit id.
 *  - major / curriculum — "เฉพาะสาขาวิศวกรรมโยธา (วศ.)" — open only if the rule
 *    mentions the student's major token.
 *  - faculty — "เฉพาะคณะวิศวกรรมศาสตร์" — open only if it mentions their faculty.
 *
 * All present constraints must pass. No rule → open. Constraints whose context we
 * don't have (e.g. major rule but no major token) are treated as open.
 */
export function isSectionOpenToStudent(
	rule: string | null | undefined,
	studentId: number,
	ctx: StudentContext = {},
): boolean {
	if (!rule?.trim()) return true

	// --- student-id constraint ---
	if (Number.isFinite(studentId)) {
		const ranges = [...rule.matchAll(/(\d{8})\s*[-–—]\s*(\d{8})/g)]
		if (ranges.length) {
			if (!ranges.some((m) => studentId >= Number(m[1]) && studentId <= Number(m[2]))) return false
		} else if (/รหัส\s*นักศึกษา|รหัสนศ/.test(rule)) {
			const singles = [...rule.matchAll(/\b(\d{8})\b/g)].map((m) => Number(m[1]))
			if (singles.length && !singles.includes(studentId)) return false
		}
	}

	// --- major / faculty constraint ---
	if (/เฉพาะสาขา|เฉพาะหลักสูตร/.test(rule)) {
		if (ctx.major && !rule.includes(ctx.major)) return false
	} else if (/เฉพาะคณะ/.test(rule)) {
		if (ctx.faculty && !rule.includes(ctx.faculty)) return false
	}

	return true
}

/** A rule that imposes any registration condition at all (for UI flagging). */
export function hasCondition(rule: string | null | undefined): boolean {
	return !!rule?.trim()
}

/** Distinctive major token from a program/department name, e.g.
 *  'วิศวกรรมคอมพิวเตอร์ (ต่อเนื่อง)' → 'คอมพิวเตอร์'. */
export function majorToken(name: string | null | undefined): string {
	if (!name) return ''
	return name
		.replace(/\(.*?\)/g, '') // drop "(วศ.)", "(ต่อเนื่อง)", "(หลักสูตรนานาชาติ)"
		.replace(/^.*?วิศวกรรม/, '') // drop the leading "...วิศวกรรม"
		.trim()
}
