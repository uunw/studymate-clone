CREATE TABLE "curriculum" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer,
	"group_id" integer,
	"year" integer,
	"name_th" varchar(256),
	"name_en" varchar(256),
	"is_visible" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"type" varchar(64),
	"name" varchar(256),
	"credit" integer,
	"color" varchar(32)
);
--> statement-breakpoint
CREATE TABLE "curriculum_group_subject" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"subject_id" varchar(16) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department" (
	"id" serial PRIMARY KEY NOT NULL,
	"faculty_id" integer,
	"kmitl_id" varchar(64),
	"name_th" varchar(256),
	"name_en" varchar(256),
	"is_visible" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faculty" (
	"id" serial PRIMARY KEY NOT NULL,
	"kmitl_id" varchar(64),
	"name_th" varchar(256),
	"name_en" varchar(256),
	"is_visible" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer,
	"kmitl_id" varchar(64),
	"name_th" varchar(256),
	"name_en" varchar(256),
	"is_visible" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subject" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"name_th" varchar(256),
	"name_en" varchar(256),
	"credit" integer,
	"detail" text
);
--> statement-breakpoint
CREATE TABLE "subject_review" (
	"id" serial PRIMARY KEY NOT NULL,
	"teachtable_id" integer,
	"user_id" text,
	"subject_id" varchar(16),
	"review" text,
	"rating" real DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"created_at" date DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subject_review_like" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"review_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teachtable" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"term" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcript" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcript_detail" (
	"id" serial PRIMARY KEY NOT NULL,
	"transcript_id" integer NOT NULL,
	"subject_id" varchar(16),
	"teachtable_id" integer,
	"grade" varchar(4)
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"username" text,
	"display_username" text,
	"first_name" text,
	"last_name" text,
	"nickname" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"curriculum_id" integer,
	"policy_viewed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "curriculum" ADD CONSTRAINT "curriculum_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum" ADD CONSTRAINT "curriculum_group_id_curriculum_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."curriculum_group"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_group_subject" ADD CONSTRAINT "curriculum_group_subject_group_id_curriculum_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."curriculum_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_group_subject" ADD CONSTRAINT "curriculum_group_subject_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_faculty_id_faculty_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program" ADD CONSTRAINT "program_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_review" ADD CONSTRAINT "subject_review_teachtable_id_teachtable_id_fk" FOREIGN KEY ("teachtable_id") REFERENCES "public"."teachtable"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_review" ADD CONSTRAINT "subject_review_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_review" ADD CONSTRAINT "subject_review_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_review_like" ADD CONSTRAINT "subject_review_like_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_review_like" ADD CONSTRAINT "subject_review_like_review_id_subject_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."subject_review"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript" ADD CONSTRAINT "transcript_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_detail" ADD CONSTRAINT "transcript_detail_transcript_id_transcript_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."transcript"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_detail" ADD CONSTRAINT "transcript_detail_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_detail" ADD CONSTRAINT "transcript_detail_teachtable_id_teachtable_id_fk" FOREIGN KEY ("teachtable_id") REFERENCES "public"."teachtable"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;