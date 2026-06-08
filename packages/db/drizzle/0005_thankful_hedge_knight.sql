CREATE TABLE "plan_subject" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subject_id" varchar(16) NOT NULL,
	"credit" integer,
	"name" text,
	"is_free" boolean DEFAULT false NOT NULL,
	CONSTRAINT "plan_user_subject_uq" UNIQUE("user_id","subject_id")
);
--> statement-breakpoint
ALTER TABLE "plan_subject" ADD CONSTRAINT "plan_subject_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;