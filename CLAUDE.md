# StudyMate Clone

Open-source rebuild of KMITL StudyMate (subject reviews + curriculum tracker).
Turborepo + pnpm monorepo. Public: github.com/uunw/studymate-clone.
Inspired-by clone; original (kmitl-savvy-students, Angular+ASP.NET) cloud went down.

## Stack
TanStack Start v1 (SSR, file routes, server fns) · React 19 · TanStack Query/Form ·
Drizzle + Postgres (Neon in prod) · Better Auth (KMITL SSO) · Tailwind v4 ·
Remeda · date-fns · Biome · Vitest.

## Layout
- apps/web — TanStack Start app
- packages/db — Drizzle schema + migrations + seed (@repo/db)
- packages/auth — Better Auth, KMITL SSO (@repo/auth)
- packages/core — Zod schemas, transcript PDF parser, GPA utils (@repo/core)
- packages/ui + packages/tailwind-config

## Runbook
    pnpm install && cp .env.example .env
    docker compose up -d            # local Postgres :5432
    pnpm db:migrate && pnpm db:seed # academic reference data
    pnpm dev                        # :3000
Verify chain (= CI): pnpm lint · pnpm typecheck · pnpm test · pnpm build

## Auth — KMITL SSO (+ email/password fallback)
Better Auth genericOAuth, generic OIDC provider id `kmitl`. Email+password and `username`
(8-digit student id) login also work as a fallback. Callback: /api/auth/oauth2/callback/kmitl.
Working endpoint = the registrar realm: ISSUER https://sso.reg.kmitl.ac.th/realms/registrar,
CLIENT_ID `KMITL-client` — a PUBLIC client (PKCE, no secret; `ssoEnabled` needs only id +
issuer). The id_token carries the student id as `preferred_username` (deriveUsername picks it
up; KMITL_SSO_STUDENT_ID_CLAIM optional). Grant admin: UPDATE "user" SET is_admin=true.

## Known landmines
- Server-only deps (Drizzle/Better Auth/pg) leak into the CLIENT bundle unless every
  @repo/db / @repo/auth/server import is used ONLY inside a createServerFn `.handler()`.
  Isolate helpers in `*.server.ts`, dynamic-import inside handlers; ssr.external the heavy
  deps in vite.config. Symptom: rollup chokes on better-auth's kysely bun-sqlite dialect.
- vite.config loadEnv→process.env so server code sees DATABASE_URL etc. in dev.
- routeTree.gen.ts is stale until `vite build`; tsc lies about route paths until regen.
- Student id: the registrar realm returns it as `preferred_username` with plain
  `openid profile email` scopes (no special claim). The old developer-hub / realms/master
  client did NOT — it needed a KDMC-granted claim.
- KMITL SSO: self-registered Developer-Hub clients on /realms/master returned "Client not
  found" (provisioning gap, see second-brain wiki concepts/kmitl-sso) — UNBLOCKED by using the
  registrar realm's public `KMITL-client` (sso.reg.kmitl.ac.th/realms/registrar).
- genericOAuth requires a non-empty `name`, but the registrar id_token omits name/given_name/
  family_name → mapProfileToUser must fall back with `||` (NOT `??`, which keeps the empty
  string) or sign-in dies as "Unable to get user info" → name_is_missing.
- Dev OAuth callback over http breaks when the browser force-upgrades localhost→https (HSTS /
  "always use secure connections"). vite.config serves TLS when apps/web/certs/ holds a
  self-signed cert; set BETTER_AUTH_URL to the SAME origin you open (e.g. https://127.0.0.1:3000).
- Seed user uses username 64010001 (matches its email). A stale DB row squatting on a real
  student id (e.g. 67015067) blocks that student's first SSO sign-in with "username already
  taken" — realign/remove the seed row.
- Build emits dist/ (no node listener) — deploy via Vercel (auto-detects TanStack Start).
- KMITL `teach_day` is 1 = อาทิตย์ … 7 = เสาร์ (NOT 1 = Monday). Day labels/filters use this;
  stored values are already in KMITL numbering — don't shift them.
- Registrar teach-table (get-teach-table-show by_class) uses NUMERIC codes (faculty 01 /
  dept 05 / curriculum 101), distinct from the seeded program/dept kmitlId ('010102'/'0101').
  Stored on curriculum.reg{Faculty,Department,Curriculum}Id. The free-elective list = the
  registrar's curated per-curriculum "กลุ่ม 1 (GenEd/เลือกเสรี)" group (class_year derived from
  the 8-digit student id), NOT catalog-wide filtering.
- Free electives are gated by เงื่อนไข (subject_class.rule_th): student-id range/set + major/
  faculty; @repo/core/eligibility.isSectionOpenToStudent parses it.

## Recent session log
### 2026-06-09 (cont.) — SPA + Firestore migration (branch migrate/firebase-spa)
Migrating off SSR/Drizzle/Neon → pure client SPA (TanStack Router, static Vite build) + Firestore
+ Firebase Auth (Google, hd=kmitl.ac.th; 8-digit id = email local-part). Project `studymate-kmitl`
(asia-southeast1), under taokaeg2. Done end-to-end:
- Shell-swap to SPA (no SSR/server fns); `lib/server-fn.ts` shim keeps server/*.ts call sites.
  Heavy server deps erased via `import type` from @repo/db. firestore.rules = the authz layer.
- Seed Postgres→Firestore (`@repo/db seed:firestore`, 2303 docs): faculties/departments/programs/
  curricula/subjects(denormalized ratingAvg/reviewCount/searchTokens/offeredDays/openSections)/
  sections/teachtables + **curricula/{id}.tree** (the curriculum_group graph denormalized as one
  ProgressGroupInput tree). `seed:reviews` adds demo reviews (sample:true) + recomputes aggregates.
  Re-seed order: seed:firestore THEN seed:reviews (firestore resets subject aggregates to 0).
- Every server/*.ts now hits Firestore / the registrar API (no empty stubs). VERIFIED in-browser
  (public, no auth): subjects browse (748), subject detail + sections + reviews, reviews feed,
  curriculum-group filter (748→26). Data layer verified via scripts: curriculum tree +
  allocateProgress (90/114, 79%). Registrar API REFLECTS CORS (access-control-allow-origin: <our
  origin>) → SPA fetches get-pattern-subject / get-teach-table-show directly, no proxy needed.
- Firestore-without-Cloud-Functions aggregates: field-scoped rules let a kmitl user update ONLY
  {ratingAvg,reviewCount} on a subject and ONLY {likeCount} on a review (recomputed client-side);
  authoritative reviews/likes stay author-gated. isAdmin sourced from admins/{uid} (not the
  self-writable profile). User data under users/{uid} (+ /private/plan, /private/transcript).
- PENDING (user action): enable the Google sign-in provider in the Firebase console — unlocks ALL
  auth-gated features (progress UI, transcript upload/parse via unpdf, review/plan/profile writes,
  admin) which were wired "blind" (green typecheck/build/lint, untested UI). KNOWN GAP: the admin
  curriculum-GROUP editor writes throw "not supported" — the denormalized tree has no group→
  curriculum index; needs a normalized curriculumGroups collection or curriculumId threaded
  through the editor (the group-tree READ + everything else works). Cleanup TODO: drop unused
  web deps (react-start/better-auth/@repo/auth), trim the ~595kB firebase chunk. See MIGRATION.md.
### 2026-06-09 — KMITL SSO unblocked + mobile-app progress UI + a11y pass
SSO works end-to-end: switched to the registrar realm public client (`KMITL-client`, PKCE, no
secret), relaxed `ssoEnabled` (id+issuer only), name fallback in mapProfileToUser (`||` not
`??`), dev HTTPS in vite (self-signed cert under apps/web/certs/, gitignored) for browsers that
force https. Verified the full browser flow via Playwright up to the KMITL login; real login
creates the user (username = preferred_username = student id). Also shipped (commit c4a9fda):
impeccable a11y/quality pass app-wide (contrast, Select/Switch components, Modal a11y, etc.) +
mobile app-style /my-subjects/progress (iOS list rows + Switch on mobile, dense table desktop).
### 2026-06-08 — feature parity + registration planning
Migrated all remaining original features; built the /my-subjects registration-planning system:
registrar pre-reg plan (get-pattern-subject), projected progress (amber) + persisted what-if
(plan_subject), free-elective picker from the curated per-curriculum teach-table + eligibility
filter, class/exam clash warnings, "เปิดสอน" badges (day-time + ลงล่วงหน้า/รับ). subject_class +=
exam/rule/remark/pre_count, curriculum += reg codes (migrations 0002–0006). Fixed day-of-week
off-by-one. Latest commit 24a38e9.
### 2026-06-03 — initial build + KMITL SSO
Built full monorepo; auth: username+OTP+Google → replaced with KMITL SSO (genericOAuth
generic OIDC) + Single Logout + configurable student-id claim. SSO verified end-to-end
locally up to KMITL Keycloak (authorize request correct); blocked on KMITL-side client
provisioning ("Client not found" for both dev+prod clients).
