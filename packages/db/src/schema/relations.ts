import { relations } from 'drizzle-orm'
import {
	curriculum,
	curriculumGroup,
	curriculumGroupSubject,
	department,
	faculty,
	program,
	subject,
	subjectReview,
	subjectReviewLike,
	teachtable,
	transcript,
	transcriptDetail,
} from './academic'
import { user } from './auth'

export const facultyRelations = relations(faculty, ({ many }) => ({
	departments: many(department),
}))

export const departmentRelations = relations(department, ({ one, many }) => ({
	faculty: one(faculty, { fields: [department.facultyId], references: [faculty.id] }),
	programs: many(program),
}))

export const programRelations = relations(program, ({ one, many }) => ({
	department: one(department, { fields: [program.departmentId], references: [department.id] }),
	curricula: many(curriculum),
}))

export const curriculumGroupRelations = relations(curriculumGroup, ({ many }) => ({
	subjects: many(curriculumGroupSubject),
}))

export const curriculumRelations = relations(curriculum, ({ one }) => ({
	program: one(program, { fields: [curriculum.programId], references: [program.id] }),
	group: one(curriculumGroup, { fields: [curriculum.groupId], references: [curriculumGroup.id] }),
}))

export const subjectRelations = relations(subject, ({ many }) => ({
	reviews: many(subjectReview),
	groups: many(curriculumGroupSubject),
}))

export const curriculumGroupSubjectRelations = relations(curriculumGroupSubject, ({ one }) => ({
	group: one(curriculumGroup, {
		fields: [curriculumGroupSubject.groupId],
		references: [curriculumGroup.id],
	}),
	subject: one(subject, {
		fields: [curriculumGroupSubject.subjectId],
		references: [subject.id],
	}),
}))

export const subjectReviewRelations = relations(subjectReview, ({ one, many }) => ({
	subject: one(subject, { fields: [subjectReview.subjectId], references: [subject.id] }),
	teachtable: one(teachtable, {
		fields: [subjectReview.teachtableId],
		references: [teachtable.id],
	}),
	author: one(user, { fields: [subjectReview.userId], references: [user.id] }),
	likes: many(subjectReviewLike),
}))

export const subjectReviewLikeRelations = relations(subjectReviewLike, ({ one }) => ({
	review: one(subjectReview, {
		fields: [subjectReviewLike.reviewId],
		references: [subjectReview.id],
	}),
	user: one(user, { fields: [subjectReviewLike.userId], references: [user.id] }),
}))

export const transcriptRelations = relations(transcript, ({ one, many }) => ({
	user: one(user, { fields: [transcript.userId], references: [user.id] }),
	details: many(transcriptDetail),
}))

export const transcriptDetailRelations = relations(transcriptDetail, ({ one }) => ({
	transcript: one(transcript, {
		fields: [transcriptDetail.transcriptId],
		references: [transcript.id],
	}),
	subject: one(subject, { fields: [transcriptDetail.subjectId], references: [subject.id] }),
	teachtable: one(teachtable, {
		fields: [transcriptDetail.teachtableId],
		references: [teachtable.id],
	}),
}))
