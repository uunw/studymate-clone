import type { Curriculum, Department, Faculty, Program } from '@repo/db'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '~/lib/firebase'
import { createServerFn } from '~/lib/server-fn'

const byNameTh = (a: { nameTh: string | null }, b: { nameTh: string | null }) =>
	(a.nameTh ?? '').localeCompare(b.nameTh ?? '', 'th')

export const listFaculties = createServerFn({ method: 'GET' }).handler(
	async (): Promise<Faculty[]> => {
		const snap = await getDocs(collection(db, 'faculties'))
		return snap.docs.map((d) => d.data() as Faculty).sort(byNameTh)
	},
)

export const listDepartments = createServerFn({ method: 'GET' })
	.inputValidator((facultyId?: number) => facultyId ?? null)
	.handler(async (ctx): Promise<Department[]> => {
		const facultyId = ctx.data as number | null | undefined
		const ref = collection(db, 'departments')
		const snap = await getDocs(facultyId ? query(ref, where('facultyId', '==', facultyId)) : ref)
		return snap.docs.map((d) => d.data() as Department).sort(byNameTh)
	})

export const listPrograms = createServerFn({ method: 'GET' })
	.inputValidator((departmentId?: number) => departmentId ?? null)
	.handler(async (ctx): Promise<Program[]> => {
		const departmentId = ctx.data as number | null | undefined
		const ref = collection(db, 'programs')
		const snap = await getDocs(
			departmentId ? query(ref, where('departmentId', '==', departmentId)) : ref,
		)
		return snap.docs.map((d) => d.data() as Program).sort(byNameTh)
	})

export const listCurricula = createServerFn({ method: 'GET' })
	.inputValidator((programId?: number) => programId ?? null)
	.handler(async (ctx): Promise<Curriculum[]> => {
		const programId = ctx.data as number | null | undefined
		const ref = collection(db, 'curricula')
		const snap = await getDocs(programId ? query(ref, where('programId', '==', programId)) : ref)
		return snap.docs
			.map((d) => d.data() as Curriculum)
			.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
	})

export const getCurriculum = createServerFn({ method: 'GET' })
	.inputValidator((id: number) => id)
	.handler(async (ctx): Promise<Curriculum | null> => {
		const snap = await getDoc(doc(db, 'curricula', String(ctx.data as number)))
		return snap.exists() ? (snap.data() as Curriculum) : null
	})
