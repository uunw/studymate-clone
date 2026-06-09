# Migration: SSR + Neon → SPA + Firestore + Firebase (free Spark)

Target: run entirely on **Firebase Spark (free)** — static SPA hosting + Firestore +
Firebase Auth. **No server runtime, no Cloud Functions.**

## Decisions (locked)

| Area | From | To |
|---|---|---|
| Frontend | TanStack **Start** (SSR, Nitro, server fns) | TanStack **Router** (pure SPA, Vite static build) |
| Hosting | Vercel | Firebase Hosting (static + SPA rewrite) |
| DB | Drizzle / Postgres (Neon) | **Firestore** (client SDK + Security Rules) |
| Auth | Better Auth + KMITL OIDC SSO | **Firebase Auth — Google sign-in restricted to `@kmitl.ac.th`** |
| Authorization | server-fn checks | **Firestore Security Rules** |

**Auth rationale:** KMITL accounts federate to Google (the registrar login offers
"Authenticate via Google"). Firebase's built-in Google provider is free on Spark
(custom OIDC is NOT). We restrict to the `kmitl.ac.th` hosted domain, derive the
8-digit student id from the email local-part (`67015067@kmitl.ac.th`), and get the
real display name from Google (so the old `name_is_missing` issue disappears).

## Hard constraints (Spark, no Cloud Functions) — design around these

- **No server** → every read/write is client-side via the Firestore SDK; the only
  authorization layer is **Security Rules**. Anything previously trusted to a server
  function must be expressible as a rule.
- **No Cloud Functions** → aggregates (review average/count, like counts) are kept by
  **client transactions**. Rules can bound them but can't fully verify the math —
  accept residual trust now; revisit with Blaze + a Function later if abused.
- **Firestore is NoSQL** → no joins, no substring/`LIKE` search, cursor pagination
  (not offset), composite indexes must be declared (`firestore.indexes.json`).
- **Admin role** needs Admin SDK for custom claims (Blaze) → use an `admins/{uid}`
  doc + rules instead (granted manually, like today's `UPDATE user SET is_admin`).

## Reuse (little/no change)

- `packages/core` — zod schemas, `termGpa`, transcript PDF parser, eligibility,
  `allocateProgress`. Pure functions → run client-side. **Verify the PDF parser
  (`unpdf`) runs in the browser**; if not, swap to `pdfjs-dist`.
- `packages/ui`, most routes/components. TanStack Router is already Start's base.

## Data model (Firestore)

Reference data = public read / admin write. User data = owner-only.

```
faculties/{facultyId}            { nameTh, nameEn, kmitlId, ... }
departments/{departmentId}       { facultyId, nameTh, ... }
programs/{programId}             { departmentId, nameTh, ... }
curricula/{curriculumId}         { programId, nameTh, year, reg{Faculty,Dept,Curriculum}Id,
                                   tree: <denormalized group tree> }   // read whole for progress
subjects/{subjectId}             { nameTh, nameEn, credit,
                                   ratingSum, reviewCount, ratingAvg,  // denormalized aggregate
                                   offeredDays: [int], openSections,    // denormalized for filters
                                   searchTokens: [string] }             // for token search
sections/{sectionId}             { subjectId, day, timeStart, timeEnd, exam*, ruleTh,
                                   capacity, preCount, ... }            // "เปิดสอน" + clash + eligibility
reviews/{reviewId}               { subjectId, authorUid, authorNickname, rating, text,
                                   likeCount, createdAt }
reviews/{reviewId}/likes/{uid}   { }                                    // membership; count denormalized
users/{uid}                      { username(studentId), email, name, firstName, lastName,
                                   nickname, curriculumId, isAdmin?, policyViewed }
users/{uid}/transcript/doc       { details: [...] }                     // private (grades)
users/{uid}/plan/doc             { items: [...] }                       // private what-if selection
admins/{uid}                     { }                                    // role marker (manual grant)
```

### Feature caveats / risks (call these out before building)

- **Subject search** (name/code substring) — Firestore can't do `contains`. Plan:
  store `searchTokens` (lowercased name words + code prefixes) and query with
  `array-contains`; OR load the catalog client-side and filter (only if the catalog
  is small enough — **verify subject count**); OR Algolia/Typesense free tier.
- **Filter by rating / day** — needs denormalized `ratingAvg` + `offeredDays` on the
  subject doc and composite indexes. Day filter that depends on live sections must be
  denormalized onto the subject (recomputed on section writes).
- **Review aggregates** — maintained in a client transaction on review create/delete;
  rules restrict who can write but can't guarantee correct sums.
- **Pagination** — cursor (`startAfter`), not page numbers; the current `page` UI
  changes to "load more" / cursor.
- **Progress / GPA / eligibility** — load `curricula/{id}.tree` + `transcript` and
  compute client-side with `packages/core`. ✓ low risk.

## Security Rules (sketch — full in `firestore.rules`)

- reference (`faculties`/`departments`/`programs`/`curricula`/`subjects`/`sections`):
  `read: public`, `write: isAdmin()`.
- `reviews`: `read: public`; `create` if signed in, `authorUid == uid`, rating ∈ 1..5;
  `update`/`delete` own. likes: own membership doc.
- `users/{uid}` and subcollections: `read,write` only if `uid == request.auth.uid`
  (admins may read for support — decide later).
- `isAdmin()` = `exists(/databases/$(db)/documents/admins/$(request.auth.uid))`.
- All writes additionally require `request.auth.token.email` ends with `@kmitl.ac.th`.

## OG / meta

SPA = one static `index.html` → **site-level OG only** (set in `index.html`). Per-page
dynamic OG (sharing a specific subject) won't render for crawlers without JS. In-app
titles still update client-side. If per-page share cards are needed later: prerender
those routes at build, or a tiny meta-serving Worker. Accepted for now: generic OG.

## Phases (each ends with a verify)

0. **Foundation (this commit):** branch, this doc, `firebase.json`, `firestore.rules`,
   `firestore.indexes.json`, `.firebaserc`. → verify: files present, rules lint.
1. **Firebase project:** create project, enable Firestore + Google Auth (restrict
   domain), `firebase login`, fill `.firebaserc`. **Verify Google email = studentid@.**
2. **SPA conversion:** TanStack Start → Router SPA (drop Nitro/server fns/`*.server.ts`),
   Vite SPA build, static `index.html` + generic OG. → verify: `pnpm build` emits static,
   app boots client-side (public pages).
3. **Firebase SDK + Auth:** add `firebase`, init app, Google sign-in (domain-restricted),
   `useSession`-equivalent, derive studentId, upsert `users/{uid}`. → verify: sign-in
   creates the user doc, header shows id/name.
4. **Data layer:** replace each `server/*.ts` with Firestore queries via TanStack Query;
   model + **seed** reference data (port `packages/db` seed → a Firestore seed script).
   → verify: subjects list, subject detail, reviews, progress render from Firestore.
5. **Writes + rules:** reviews (+ aggregate txn), plan selection, profile, transcript
   upload (client-side parse → `users/{uid}/transcript`), admin curriculum tools.
   → verify: rules tests pass (`@firebase/rules-unit-testing`), no cross-user writes.
6. **Data migration:** script Neon → Firestore for reference data (+ any real users).
   → verify: counts match.
7. **Deploy:** `firebase deploy` (Hosting + rules + indexes); smoke test. → verify: live.

## Rollback

Work stays on `migrate/firebase-spa`; **`main` (Vercel + Neon) keeps running** until a
deliberate cutover. Each phase is a commit; revert per-phase if needed.

## Open items to verify (gates)

1. **KMITL Google email format** — is it `studentid@kmitl.ac.th`? If it's `name@…`,
   the student id can't come from the email → fall back to a one-time id entry on the
   profile, or the Cloudflare-Worker OIDC hybrid. **Blocks phase 3 auth.**
2. **Subject catalog size** — decides client-filter vs search service (phase 4).
3. **`unpdf` in browser** — decides transcript-parse approach (phase 5).
