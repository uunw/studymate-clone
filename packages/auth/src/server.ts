import { db, schema } from '@repo/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { emailOTP, username } from 'better-auth/plugins'
import { sendEmail } from './email'

/** KMITL students sign up with <studentId>@kmitl.ac.th. */
export const KMITL_EMAIL_DOMAIN = 'kmitl.ac.th'
const STUDENT_ID_RE = /^\d{8}$/

const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
	secret: process.env.BETTER_AUTH_SECRET,
	trustedOrigins: [process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'],

	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user: schema.user,
			session: schema.session,
			account: schema.account,
			verification: schema.verification,
		},
	}),

	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
		minPasswordLength: 8,
	},

	// StudyMate profile columns live on the user table.
	user: {
		additionalFields: {
			firstName: { type: 'string', required: false },
			lastName: { type: 'string', required: false },
			nickname: { type: 'string', required: false },
			isAdmin: { type: 'boolean', required: false, defaultValue: false, input: false },
			curriculumId: { type: 'number', required: false },
			policyViewed: { type: 'boolean', required: false, defaultValue: false, input: false },
		},
	},

	socialProviders: googleEnabled
		? {
				google: {
					clientId: process.env.GOOGLE_CLIENT_ID as string,
					clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
				},
			}
		: undefined,

	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					// Restrict to the KMITL domain (mirrors the original kmitl.ac.th gate).
					const email = user.email.toLowerCase()
					if (!email.endsWith(`@${KMITL_EMAIL_DOMAIN}`)) {
						throw new APIError('BAD_REQUEST', {
							message: `Only @${KMITL_EMAIL_DOMAIN} accounts are allowed`,
						})
					}
					// For OAuth sign-ups (no username), derive the student id from the email.
					const local = email.split('@')[0] ?? ''
					const derivedUsername = STUDENT_ID_RE.test(local) ? local : undefined
					return {
						data: {
							...user,
							username: (user as { username?: string }).username ?? derivedUsername,
						},
					}
				},
			},
		},
	},

	plugins: [
		username({
			minUsernameLength: 8,
			maxUsernameLength: 8,
			usernameValidator: (value) => STUDENT_ID_RE.test(value),
		}),
		emailOTP({
			otpLength: 6,
			expiresIn: 600, // 10 minutes
			sendVerificationOnSignUp: true,
			async sendVerificationOTP({ email, otp, type }) {
				const label =
					type === 'sign-in'
						? 'sign in'
						: type === 'forget-password'
							? 'reset your password'
							: 'verify your email'
				await sendEmail({
					to: email,
					subject: `StudyMate OTP: ${otp}`,
					text: `Your StudyMate code to ${label} is ${otp}. It expires in 10 minutes.`,
				})
			},
		}),
	],
})

export type Auth = typeof auth
export type Session = Auth['$Infer']['Session']
