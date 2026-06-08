import {
	boolean,
	date,
	integer,
	pgTable,
	real,
	serial,
	text,
	timestamp,
	unique,
	varchar,
} from 'drizzle-orm/pg-core'
import { user } from './auth'

/**
 * Academic domain — ported 1:1 from the original StudyMate MySQL model
 * (Faculty → Department → Program → Curriculum → CurriculumGroup → Subject),
 * with idiomatic Postgres naming. Soft FK references via `.references()`.
 */

// ---- Organizational hierarchy ----

export const faculty = pgTable(
	'faculty',
	{
		id: serial('id').primaryKey(),
		kmitlId: varchar('kmitl_id', { length: 64 }),
		nameTh: varchar('name_th', { length: 256 }),
		nameEn: varchar('name_en', { length: 256 }),
		isVisible: integer('is_visible').default(1).notNull(),
	},
	(t) => [unique('faculty_kmitl_uq').on(t.kmitlId)],
)

export const department = pgTable(
	'department',
	{
		id: serial('id').primaryKey(),
		facultyId: integer('faculty_id').references(() => faculty.id, { onDelete: 'set null' }),
		kmitlId: varchar('kmitl_id', { length: 64 }),
		nameTh: varchar('name_th', { length: 256 }),
		nameEn: varchar('name_en', { length: 256 }),
		isVisible: integer('is_visible').default(1).notNull(),
	},
	(t) => [unique('department_fac_kmitl_uq').on(t.facultyId, t.kmitlId)],
)

export const program = pgTable(
	'program',
	{
		id: serial('id').primaryKey(),
		departmentId: integer('department_id').references(() => department.id, {
			onDelete: 'set null',
		}),
		kmitlId: varchar('kmitl_id', { length: 64 }),
		nameTh: varchar('name_th', { length: 256 }),
		nameEn: varchar('name_en', { length: 256 }),
		isVisible: integer('is_visible').default(1).notNull(),
	},
	(t) => [unique('program_dept_kmitl_uq').on(t.departmentId, t.kmitlId)],
)

// ---- Curriculum structure ----

export const curriculumGroup = pgTable('curriculum_group', {
	id: serial('id').primaryKey(),
	parentId: integer('parent_id'), // self-reference; null for root group
	type: varchar('type', { length: 64 }),
	name: varchar('name', { length: 256 }),
	credit: integer('credit'),
	color: varchar('color', { length: 32 }),
	// subject-code prefix this group also accepts (beyond explicit links), e.g.
	// '90' = any KMITL gen-ed subject counts toward this group up to its credit.
	acceptPrefix: varchar('accept_prefix', { length: 16 }),
})

export const curriculum = pgTable('curriculum', {
	id: serial('id').primaryKey(),
	programId: integer('program_id').references(() => program.id, { onDelete: 'set null' }),
	groupId: integer('group_id').references(() => curriculumGroup.id, { onDelete: 'set null' }),
	year: integer('year'),
	nameTh: varchar('name_th', { length: 256 }),
	nameEn: varchar('name_en', { length: 256 }),
	isVisible: integer('is_visible').default(1).notNull(),
	// registrar teach-table codes (get-teach-table-show by_class), for fetching
	// this curriculum's curated subject list (e.g. 01 / 05 / 101).
	regFacultyId: varchar('reg_faculty_id', { length: 8 }),
	regDepartmentId: varchar('reg_department_id', { length: 8 }),
	regCurriculumId: varchar('reg_curriculum_id', { length: 8 }),
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

export const teachtable = pgTable(
	'teachtable',
	{
		id: serial('id').primaryKey(),
		year: integer('year').notNull(),
		term: integer('term').notNull(),
	},
	(t) => [unique('teachtable_year_term_uq').on(t.year, t.term)],
)

// ---- Subject offerings / sections (from the KMITL registrar teach-table API) ----

export const subjectClass = pgTable('subject_class', {
	id: varchar('id', { length: 32 }).primaryKey(), // registrar teach_table_id
	subjectId: varchar('subject_id', { length: 16 }).references(() => subject.id, {
		onDelete: 'cascade',
	}),
	teachtableId: integer('teachtable_id').references(() => teachtable.id, { onDelete: 'set null' }),
	programId: integer('program_id').references(() => program.id, { onDelete: 'set null' }),
	section: varchar('section', { length: 16 }),
	lectOrPrac: varchar('lect_or_prac', { length: 8 }),
	day: integer('day'),
	timeStart: varchar('time_start', { length: 8 }),
	timeEnd: varchar('time_end', { length: 8 }),
	room: varchar('room', { length: 64 }),
	building: varchar('building', { length: 64 }),
	teacherTh: text('teacher_th'),
	teacherEn: text('teacher_en'),
	capacity: integer('capacity'),
	enrolled: integer('enrolled'),
	closed: boolean('closed').default(false),
	// exam date-times + registration conditions (เงื่อนไข) from the teach-table
	examMidterm: text('exam_midterm'),
	examFinal: text('exam_final'),
	ruleTh: text('rule_th'),
	remark: text('remark'),
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

// ---- Saved what-if registration plan (the progress-tab simulation) ----

export const planSubject = pgTable(
	'plan_subject',
	{
		id: serial('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		subjectId: varchar('subject_id', { length: 16 }).notNull(),
		credit: integer('credit'),
		name: text('name'),
		isFree: boolean('is_free').default(false).notNull(),
	},
	(t) => [unique('plan_user_subject_uq').on(t.userId, t.subjectId)],
)
