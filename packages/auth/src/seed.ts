import { db, eq, schema } from '@repo/db'
import { auth } from './server'

/**
 * Creates a demo admin via the Better Auth API so the password is hashed the
 * same way the app verifies it. Run after `pnpm --filter @repo/db seed`.
 *
 *   student id / username : 64010001
 *   email                 : 64010001@kmitl.ac.th
 *   password              : Test@1234
 */
async function main() {
	const email = '64010001@kmitl.ac.th'
	const username = '64010001'

	const existing = await db.query.user.findFirst({ where: eq(schema.user.username, username) })
	if (existing) {
		console.info('demo admin already exists, skipping')
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

	// Promote to admin + mark verified so the demo account can sign in immediately.
	await db
		.update(schema.user)
		.set({ isAdmin: true, emailVerified: true })
		.where(eq(schema.user.username, username))

	console.info(`✅ demo admin created — login ${username} / Test@1234`)
	process.exit(0)
}

main().catch((err) => {
	console.error('❌ auth seed failed:', err)
	process.exit(1)
})
