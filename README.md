# StudyMate Clone

> An open-source rebuild of **StudyMate** — a KMITL subject-review & curriculum-tracking
> web app — on a modern, fully type-safe TanStack stack.
>
> ⚠️ **This is a clone, built for learning.** It was inspired by the original
> [kmitl-savvy-students/studymate](https://github.com/kmitl-savvy-students) project
> (Angular + ASP.NET). I rebuilt it from scratch after the original hosting went down,
> to keep the idea alive and to explore a different architecture. **Not affiliated with,
> or endorsed by, KMITL.**

[![CI](https://github.com/uunw/studymate-clone/actions/workflows/ci.yml/badge.svg)](https://github.com/uunw/studymate-clone/actions/workflows/ci.yml)

---

## ✨ Features

- 🔐 **Auth** — sign in with your real **KMITL account** via SSO (OpenID Connect,
  configured as a generic OIDC provider through **Better Auth**'s `genericOAuth`
  plugin). Accounts are auto-provisioned on first login; the 8-digit student id is
  read from the OIDC claims.
- 📚 **Subjects** — browse, search, and paginate the course catalog; per-subject
  average rating + review count.
- ⭐ **Reviews** — write/replace a review per (subject, year, term), rate 0.5–5 stars,
  like/unlike reviews.
- 🎓 **Curriculum hierarchy** — Faculty → Department → Program → Curriculum, with admin CRUD.
- 📄 **Transcript** — upload a PDF transcript, parse grades, compute GPA and
  curriculum progress.
- 👤 **Profile** — edit name/nickname, pick a curriculum, change password.

## 🧱 Stack

| Layer | Choice |
| --- | --- |
| Framework | **TanStack Start** (v1) + **TanStack Router** — SSR, file-based routing, server functions |
| Data | **TanStack Query** v5 (loader-prefetch + `useSuspenseQuery`) |
| Forms | **TanStack Form** v1 + **Zod** (Standard Schema) |
| ORM / DB | **Drizzle ORM** + **PostgreSQL** (local) / **Neon** (prod) |
| Auth | **Better Auth** (`genericOAuth` → KMITL OIDC SSO) |
| UI | **React 19** + **Tailwind CSS v4** (CSS-first `@theme`) |
| Utils | **Remeda**, **date-fns** v4, **Jotai** |
| Tooling | **Turborepo** + **pnpm** workspaces, **Biome**, **Vitest** |

## 🗂️ Monorepo layout

```
studymate-clone/
├── apps/
│   └── web/                  # TanStack Start app (routes, SSR, server functions)
├── packages/
│   ├── db/                   # Drizzle schema + client + migrations  (@repo/db)
│   ├── auth/                 # Better Auth server + client config     (@repo/auth)
│   ├── core/                 # Zod schemas, domain logic, transcript parser (@repo/core)
│   ├── ui/                   # Shared React 19 components             (@repo/ui)
│   └── tailwind-config/      # Shared Tailwind v4 theme tokens
└── turbo.json
```

Server-only code (Drizzle, Better Auth) is isolated behind `createServerFn` handlers and
`*.server.ts` modules, so it is stripped from the client bundle. Heavy deps are kept
external to the SSR bundle (see `apps/web/vite.config.ts`).

## 🚀 Quick start

**Prerequisites:** Node ≥ 22, [pnpm](https://pnpm.io) 10, Docker (for local Postgres).

```bash
# 1. install
pnpm install

# 2. env
cp .env.example .env          # defaults work for local docker Postgres

# 3. start Postgres
docker compose up -d

# 4. create schema + seed reference data
pnpm db:migrate
pnpm db:seed                  # faculties, subjects, teachtables…

# 5. run
pnpm dev                      # http://localhost:3000
```

### Logging in

Login uses **KMITL SSO**. Set `KMITL_SSO_CLIENT_ID` / `KMITL_SSO_CLIENT_SECRET` /
`KMITL_SSO_ISSUER` in `.env` (register an SSO client at
[developer.kmitl.ac.th](https://developer.kmitl.ac.th) and add the redirect URI
`http://localhost:3000/api/auth/oauth2/callback/kmitl`). Until those are set, public
pages work but sign-in is disabled. First login auto-creates the account; to grant
admin, flip the flag on your user row:

```sql
UPDATE "user" SET is_admin = true WHERE username = '<your-student-id>';
```

## 📜 Scripts

| Command | What |
| --- | --- |
| `pnpm dev` | Run the web app (SSR) on :3000 |
| `pnpm build` | Build all packages |
| `pnpm lint` | Biome lint + format check |
| `pnpm typecheck` | `tsc --noEmit` across the workspace |
| `pnpm test` | Vitest unit tests |
| `pnpm db:generate` | Generate a Drizzle migration from schema changes |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Seed academic reference data |
| `pnpm db:studio` | Open Drizzle Studio |

## ☁️ Deployment (Vercel + Neon)

The app is **deploy-ready** but intentionally not deployed here.

1. **Database** — create a **[Neon](https://neon.com)** Postgres project. Use the
   **pooled** connection string (`-pooler` endpoint) as `DATABASE_URL`. Run
   `pnpm db:migrate` against it once.
2. **Host** — import the repo into **Vercel** (it auto-detects TanStack Start). Set the
   project **Root Directory** to `apps/web`.
3. **Env vars** (Vercel project settings):

   | Var | Notes |
   | --- | --- |
   | `DATABASE_URL` | Neon pooled connection string |
   | `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
   | `BETTER_AUTH_URL` | your production URL |
   | `KMITL_SSO_CLIENT_ID` / `KMITL_SSO_CLIENT_SECRET` | from the KMITL SSO client |
   | `KMITL_SSO_ISSUER` | OIDC issuer (discovery is derived from it) |

The stack is portable — Drizzle + Postgres, Better Auth, and TanStack Start (via Nitro)
all run on Cloudflare/Netlify/Fly with config changes only, so you are not locked in.

## ⚖️ Disclaimer & License

This is an independent, educational reimplementation inspired by StudyMate. It is **not
affiliated with KMITL** and ships no data from the original service. All trademarks belong
to their respective owners.

Licensed under the [MIT License](./LICENSE).
