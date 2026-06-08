CREATE TABLE "subject_class" (
	"id" varchar(32) PRIMARY KEY NOT NULL,
	"subject_id" varchar(16),
	"teachtable_id" integer,
	"program_id" integer,
	"section" varchar(16),
	"lect_or_prac" varchar(8),
	"day" integer,
	"time_start" varchar(8),
	"time_end" varchar(8),
	"room" varchar(64),
	"building" varchar(64),
	"teacher_th" text,
	"teacher_en" text,
	"capacity" integer,
	"enrolled" integer,
	"closed" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "subject_class" ADD CONSTRAINT "subject_class_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_class" ADD CONSTRAINT "subject_class_teachtable_id_teachtable_id_fk" FOREIGN KEY ("teachtable_id") REFERENCES "public"."teachtable"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_class" ADD CONSTRAINT "subject_class_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_fac_kmitl_uq" UNIQUE("faculty_id","kmitl_id");--> statement-breakpoint
ALTER TABLE "faculty" ADD CONSTRAINT "faculty_kmitl_uq" UNIQUE("kmitl_id");--> statement-breakpoint
ALTER TABLE "program" ADD CONSTRAINT "program_dept_kmitl_uq" UNIQUE("department_id","kmitl_id");--> statement-breakpoint
ALTER TABLE "teachtable" ADD CONSTRAINT "teachtable_year_term_uq" UNIQUE("year","term");