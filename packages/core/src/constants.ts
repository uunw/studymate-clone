export const KMITL_EMAIL_DOMAIN = 'kmitl.ac.th'

/** 8-digit KMITL student id. */
export const STUDENT_ID_RE = /^\d{8}$/

/** 8-digit subject code, e.g. "01006012". */
export const SUBJECT_ID_RE = /^\d{8}$/

/**
 * Strong-password rule ported from the original backend:
 * at least one letter, one digit, one special char, length >= 8.
 */
export const STRONG_PASSWORD_RE = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/

/** Grade → grade point (KMITL). Non-GPA grades map to null. */
export const GRADE_POINTS: Record<string, number | null> = {
	A: 4,
	'B+': 3.5,
	B: 3,
	'C+': 2.5,
	C: 2,
	'D+': 1.5,
	D: 1,
	F: 0,
	S: null, // satisfactory (no GPA)
	U: null, // unsatisfactory (no GPA)
	T: null, // transfer
	W: null, // withdrawn
}

export const VALID_GRADES = Object.keys(GRADE_POINTS)

export const TERMS = [1, 2, 3] as const
export type Term = (typeof TERMS)[number]
