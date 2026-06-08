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
(8-digit student id) login also work as a fallback while SSO is blocked.
Env: KMITL_SSO_CLIENT_ID / _SECRET / _ISSUER (https://sso.kmitl.ac.th/realms/master) /
_STUDENT_ID_CLAIM. Callback: /api/auth/oauth2/callback/kmitl.
Register client at developer.kmitl.ac.th. Grant admin: UPDATE "user" SET is_admin=true.

## Known landmines
- Server-only deps (Drizzle/Better Auth/pg) leak into the CLIENT bundle unless every
  @repo/db / @repo/auth/server import is used ONLY inside a createServerFn `.handler()`.
  Isolate helpers in `*.server.ts`, dynamic-import inside handlers; ssr.external the heavy
  deps in vite.config. Symptom: rollup chokes on better-auth's kysely bun-sqlite dialect.
- vite.config loadEnv→process.env so server code sees DATABASE_URL etc. in dev.
- routeTree.gen.ts is stale until `vite build`; tsc lies about route paths until regen.
- Student id is NOT in default OIDC claims (openid profile email) — special KDMC claim.
- KMITL SSO: clients created in Developer Hub can show SYNC=done but Keycloak returns
  "Client not found" (provisioning gap) — see second-brain wiki concepts/kmitl-sso.
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
