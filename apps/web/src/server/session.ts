import { auth } from '~/lib/firebase'

export type SessionUser = {
	id: string
	email: string
	username: string | null
	name: string
	firstName: string | null
	lastName: string | null
	nickname: string | null
	image: string | null
	isAdmin: boolean
	curriculumId: number | null
	policyViewed: boolean
}

/**
 * Current user from Firebase Auth, mapped to the app's SessionUser shape. The
 * 8-digit student id is the @kmitl.ac.th email local-part; the real name comes
 * from Google. TODO(phase 4): merge the Firestore users/{uid} profile doc
 * (curriculumId, isAdmin, nickname, policyViewed).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
	await auth.authStateReady()
	const u = auth.currentUser
	const email = u?.email ?? ''
	if (!u || !email.toLowerCase().endsWith('@kmitl.ac.th')) return null
	const local = email.split('@')[0] ?? ''
	const studentId = /^\d{8}$/.test(local) ? local : null
	const display = u.displayName ?? ''
	const [firstName, ...rest] = display.split(' ')
	return {
		id: u.uid,
		email,
		username: studentId,
		name: display || local,
		firstName: firstName || null,
		lastName: rest.join(' ') || null,
		nickname: display || null,
		image: u.photoURL ?? null,
		isAdmin: false,
		curriculumId: null,
		policyViewed: false,
	}
}
