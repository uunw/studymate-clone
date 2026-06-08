import { db, eq, schema } from '@repo/db'
import { auth } from './server'

/**
 * Demo admin via the Better Auth API (correct password hashing). Run after the
 * db seeds. Login: email 64010001@kmitl.ac.th / username 64010001 / Test@1234.
 */
async function main() {
	const username = '64010001'
	const email = `${username}@kmitl.ac.th`

	const existing = await db.query.user.findFirst({ where: eq(schema.user.username, username) })
	if (existing) {
		console.info('demo user already exists, skipping')
		process.exit(0)
	}

	await auth.api.signUpEmail({
		body: {
			email,
			username,
			password: 'Test@1234',
			name: 'Test User',
			firstName: 'Test',
			lastName: 'User',
			nickname: 'tester',
		},
	})
	await db
		.update(schema.user)
		.set({ isAdmin: true, emailVerified: true })
		.where(eq(schema.user.username, username))

	console.info(`✅ demo admin — login ${email} (or ${username}) / Test@1234`)
	process.exit(0)
}

main().catch((err) => {
	console.error('❌ auth seed failed:', err)
	process.exit(1)
})
