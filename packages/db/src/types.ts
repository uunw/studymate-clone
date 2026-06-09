// Row types inferred from the Drizzle schema, exported so consumers can reuse
// them via `import type` (erased at build — no Drizzle runtime pulled in).
import type * as schema from './schema'

export type Faculty = typeof schema.faculty.$inferSelect
export type Department = typeof schema.department.$inferSelect
export type Program = typeof schema.program.$inferSelect
export type CurriculumGroup = typeof schema.curriculumGroup.$inferSelect
export type Curriculum = typeof schema.curriculum.$inferSelect
export type Subject = typeof schema.subject.$inferSelect
export type Teachtable = typeof schema.teachtable.$inferSelect
export type SubjectClass = typeof schema.subjectClass.$inferSelect
export type SubjectReview = typeof schema.subjectReview.$inferSelect
export type Transcript = typeof schema.transcript.$inferSelect
export type TranscriptDetail = typeof schema.transcriptDetail.$inferSelect
export type PlanSubject = typeof schema.planSubject.$inferSelect
export type User = typeof schema.user.$inferSelect
