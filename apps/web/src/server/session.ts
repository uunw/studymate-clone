import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '~/lib/firebase'

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
 * from Google. The Firestore users/{uid} profile doc (curriculumId, nickname,
 * policyViewed) is merged in when present; writes land there via server/profile.ts.
 * isAdmin comes from the admins/{uid} marker (not the self-writable profile).
 */
type ProfileDoc = {
	curriculumId?: number | null
	nickname?: string | null
	firstName?: string | null
	lastName?: string | null
	policyViewed?: boolean
}

/** Verified @kmitl.ac.th uid, or null when signed out / wrong domain. */
export function currentUid(): string | null {
	const u = auth.currentUser
	const email = u?.email ?? ''
	if (!u || !email.toLowerCase().endsWith('@kmitl.ac.th')) return null
	return u.uid
}
/** uid for write handlers; throws when not signed in (rules enforce it too). */
export function requireUid(): string {
	const uid = currentUid()
	if (!uid) throw new Error('UNAUTHENTICATED')
	return uid
}

export async function getSessionUser(): Promise<SessionUser | null> {
	await auth.authStateReady()
	const u = auth.currentUser
	const email = u?.email ?? ''
	if (!u || !email.toLowerCase().endsWith('@kmitl.ac.th')) return null
	const local = email.split('@')[0] ?? ''
	const studentId = /^\d{8}$/.test(local) ? local : null
	const display = u.displayName ?? ''
	const [firstName, ...rest] = display.split(' ')

	const [profileSnap, adminSnap] = await Promise.all([
		getDoc(doc(db, 'users', u.uid)),
		getDoc(doc(db, 'admins', u.uid)),
	])
	const p: ProfileDoc = profileSnap.exists() ? (profileSnap.data() as ProfileDoc) : {}

	return {
		id: u.uid,
		email,
		username: studentId,
		name: display || local,
		firstName: p.firstName ?? firstName ?? null,
		lastName: p.lastName ?? (rest.join(' ') || null),
		nickname: p.nickname ?? display ?? null,
		image: u.photoURL ?? null,
		isAdmin: adminSnap.exists(),
		curriculumId: p.curriculumId ?? null,
		policyViewed: p.policyViewed === true,
	}
}
