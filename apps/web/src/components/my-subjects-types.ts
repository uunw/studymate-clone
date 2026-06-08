/** A parsed transcript row joined with its subject + term, shared by the
 *  my-subjects child routes (transcript / progress / grades). */
export type Detail = {
	id: number
	subjectId: string | null
	grade: string | null
	nameTh: string | null
	nameEn: string | null
	credit: number | null
	year: number | null
	term: number | null
}
