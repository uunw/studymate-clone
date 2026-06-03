import { format } from 'date-fns'

/** Buddhist-era year (Gregorian + 543). */
export function toBuddhistYear(date: Date): number {
	return date.getFullYear() + 543
}

/** e.g. "3 มิ.ย. 2569" (day month + Buddhist year). */
const TH_MONTHS_SHORT = [
	'ม.ค.',
	'ก.พ.',
	'มี.ค.',
	'เม.ย.',
	'พ.ค.',
	'มิ.ย.',
	'ก.ค.',
	'ส.ค.',
	'ก.ย.',
	'ต.ค.',
	'พ.ย.',
	'ธ.ค.',
]
export function formatThaiDate(date: Date): string {
	return `${date.getDate()} ${TH_MONTHS_SHORT[date.getMonth()]} ${toBuddhistYear(date)}`
}

export function formatDateTime(date: Date): string {
	return format(date, 'yyyy-MM-dd HH:mm')
}

/** "ภาคเรียนที่ 1/2566" */
export function formatTerm(year: number, term: number): string {
	return `ภาคเรียนที่ ${term}/${year}`
}
