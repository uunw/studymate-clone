import {
	GoogleAuthProvider,
	onAuthStateChanged,
	signInWithPopup,
	signOut as fbSignOut,
	type User,
} from 'firebase/auth'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { auth } from './firebase'

const KMITL_DOMAIN = 'kmitl.ac.th'
const STUDENT_ID_RE = /^\d{8}$/

/** App-facing user. studentId is the 8-digit id derived from the @kmitl.ac.th email
 *  local-part (e.g. 67015067@kmitl.ac.th → 67015067); null if the email isn't numeric. */
export type KmitlUser = {
	uid: string
	email: string
	name: string
	studentId: string | null
}

function isKmitlEmail(email: string | null | undefined): email is string {
	return !!email && email.toLowerCase().endsWith(`@${KMITL_DOMAIN}`)
}

function toKmitlUser(u: User): KmitlUser {
	const email = u.email ?? ''
	const local = email.split('@')[0] ?? ''
	return {
		uid: u.uid,
		email,
		name: u.displayName || local,
		studentId: STUDENT_ID_RE.test(local) ? local : null,
	}
}

type AuthState = {
	user: KmitlUser | null
	loading: boolean
	signIn: () => Promise<void>
	signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<KmitlUser | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		return onAuthStateChanged(auth, (u) => {
			if (u && isKmitlEmail(u.email)) {
				setUser(toKmitlUser(u))
			} else {
				setUser(null)
				if (u) void fbSignOut(auth) // signed in but not @kmitl.ac.th → reject
			}
			setLoading(false)
		})
	}, [])

	const value = useMemo<AuthState>(
		() => ({
			user,
			loading,
			async signIn() {
				const provider = new GoogleAuthProvider()
				// hd hints/limits the Google account picker to the kmitl.ac.th workspace.
				provider.setCustomParameters({ hd: KMITL_DOMAIN, prompt: 'select_account' })
				const res = await signInWithPopup(auth, provider)
				if (!isKmitlEmail(res.user.email)) {
					await fbSignOut(auth)
					throw new Error('ใช้ได้เฉพาะบัญชี @kmitl.ac.th')
				}
			},
			async signOut() {
				await fbSignOut(auth)
			},
		}),
		[user, loading],
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
	const ctx = useContext(AuthContext)
	if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
	return ctx
}
