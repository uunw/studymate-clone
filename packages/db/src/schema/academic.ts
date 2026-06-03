import { date, integer, pgTable, real, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { user } from './auth'

/**
 * Academic domain — ported 1:1 from the original StudyMate MySQL model
 * (Faculty → Department → Program → Curriculum → CurriculumGroup → Subject),
 * with idiomatic Postgres naming. Soft FK references via `.references()`.
 */

// ---- Organizational hierarchy ----

export const faculty = pgTable('faculty', {
	id: serial('id').primaryKey(),
	kmitlId: varchar('kmitl_id', { length: 64 }),
	nameTh: varchar('name_th', { length: 256 }),
	nameEn: varchar('name_en', { length: 256 }),
	isVisible: integer('is_visible').default(1).notNull(),
})

export const department = pgTable('department', {
	id: serial('id').primaryKey(),
	facultyId: integer('faculty_id').references(() => faculty.id, { onDelete: 'set null' }),
	kmitlId: varchar('kmitl_id', { length: 64 }),
	nameTh: varchar('name_th', { length: 256 }),
	nameEn: varchar('name_en', { length: 256 }),
	isVisible: integer('is_visible').default(1).notNull(),
})

export const program = pgTable('program', {
	id: serial('id').primaryKey(),
	departmentId: integer('department_id').references(() => department.id, { onDelete: 'set null' }),
	kmitlId: varchar('kmitl_id', { length: 64 }),
	nameTh: varchar('name_th', { length: 256 }),
	nameEn: varchar('name_en', { length: 256 }),
	isVisible: integer('is_visible').default(1).notNull(),
})

// ---- Curriculum structure ----

export const curriculumGroup = pgTable('curriculum_group', {
	id: serial('id').primaryKey(),
	parentId: integer('parent_id'), // self-reference; null for root group
	type: varchar('type', { length: 64 }),
	name: varchar('name', { length: 256 }),
	credit: integer('credit'),
	color: varchar('color', { length: 32 }),
})

export const curriculum = pgTable('curriculum', {
	id: serial('id').primaryKey(),
	programId: integer('program_id').references(() => program.id, { onDelete: 'set null' }),
	groupId: integer('group_id').references(() => curriculumGroup.id, { onDelete: 'set null' }),
	year: integer('year'),
	nameTh: varchar('name_th', { length: 256 }),
	nameEn: varchar('name_en', { length: 256 }),
	isVisible: integer('is_visible').default(1).notNull(),
})

// ---- Subjects ----

export const subject = pgTable('subject', {
	id: varchar('id', { length: 16 }).primaryKey(), // e.g. "06016101"
	nameTh: varchar('name_th', { length: 256 }),
	nameEn: varchar('name_en', { length: 256 }),
	credit: integer('credit'),
	detail: text('detail'),
})

export const curriculumGroupSubject = pgTable('curriculum_group_subject', {
	id: serial('id').primaryKey(),
	groupId: integer('group_id')
		.notNull()
		.references(() => curriculumGroup.id, { onDelete: 'cascade' }),
	subjectId: varchar('subject_id', { length: 16 })
		.notNull()
		.references(() => subject.id, { onDelete: 'cascade' }),
})

// ---- Academic year / term ----

export const teachtable = pgTable('teachtable', {
	id: serial('id').primaryKey(),
	year: integer('year').notNull(),
	term: integer('term').notNull(),
})

// ---- Reviews ----

export const subjectReview = pgTable('subject_review', {
	id: serial('id').primaryKey(),
	teachtableId: integer('teachtable_id').references(() => teachtable.id, { onDelete: 'set null' }),
	userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
	subjectId: varchar('subject_id', { length: 16 }).references(() => subject.id, {
		onDelete: 'cascade',
	}),
	review: text('review'),
	rating: real('rating').default(0).notNull(),
	likeCount: integer('like_count').default(0).notNull(),
	createdAt: date('created_at').defaultNow(),
})

export const subjectReviewLike = pgTable('subject_review_like', {
	id: serial('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	reviewId: integer('review_id')
		.notNull()
		.references(() => subjectReview.id, { onDelete: 'cascade' }),
})

// ---- Transcript ----

export const transcript = pgTable('transcript', {
	id: serial('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const transcriptDetail = pgTable('transcript_detail', {
	id: serial('id').primaryKey(),
	transcriptId: integer('transcript_id')
		.notNull()
		.references(() => transcript.id, { onDelete: 'cascade' }),
	subjectId: varchar('subject_id', { length: 16 }).references(() => subject.id, {
		onDelete: 'set null',
	}),
	teachtableId: integer('teachtable_id').references(() => teachtable.id, { onDelete: 'set null' }),
	grade: varchar('grade', { length: 4 }),
})
