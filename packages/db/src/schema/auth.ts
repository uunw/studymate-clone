import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Better Auth core tables.
 *
 * Field (TS) names are camelCase because the Better Auth Drizzle adapter looks
 * columns up by camelCase key; the DB column names are snake_case.
 *
 * The `user` table carries StudyMate's app-specific columns as Better Auth
 * `additionalFields` (see @repo/auth): the 8-digit KMITL student id lives in
 * `username` (username plugin); firstName/lastName/nickname/isAdmin/curriculumId
 * /policyViewed mirror the original `user` table.
 */
export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	// username plugin: KMITL 8-digit student id
	username: text('username').unique(),
	displayUsername: text('display_username'),
	// StudyMate profile fields
	firstName: text('first_name'),
	lastName: text('last_name'),
	nickname: text('nickname'),
	isAdmin: boolean('is_admin').default(false).notNull(),
	curriculumId: integer('curriculum_id'),
	policyViewed: boolean('policy_viewed').default(false).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const account = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
