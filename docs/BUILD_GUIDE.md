# Build guide

How Equilibria was built, in the order it was built, with the reasoning behind each decision. Each phase matches one or two commits, so you can run `git log --oneline` and `git show <commit>` alongside this guide.

## 0. Mental model

The app has four layers. Most design decisions come down to keeping each concern in exactly one of them.

```
Browser (Client Components)   forms, buttons, optimistic UI     src/components/**  ("use client")
        │  fetch JSON / multipart
        ▼
Route Handlers                 HTTP only: auth, parse, respond   src/app/api/**/route.ts
        │  typed function calls
        ▼
Services                       business rules + Prisma queries   src/server/services/*.ts
        │
        ▼
PostgreSQL                     constraints as the last defense   prisma/schema.prisma

Pure logic (no I/O, used by all layers): src/lib/*.ts. Dates, cycle math, nutrition, validation.
Server Components (pages) read through services directly. They never call their own HTTP API.
```

Why it's shaped this way:

- **Pure logic is the easiest thing to test**, so anything that can be a pure function is one (`computeInsights`, `totalForEntries`, `detectImageType`).
- **Route handlers stay thin.** Each one is "authenticate, validate, call a service, respond", so they all look the same and are easy to review.
- **Services always take `userId` as their first argument** and filter by it. That's where authorization lives: one user can't read another user's data, even by guessing an ID.
- **The database enforces the rules that matter most**: unique indexes, foreign keys, composite keys. They still hold if application code has a bug or two requests race.

## 1. Scaffold (commit "Scaffold Next.js 16 app…")

```bash
npx create-next-app@16.4.3 equilibria --ts --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-npm --no-react-compiler --turbopack
npm install @prisma/client@7.10.1 @prisma/adapter-pg@7.10.1 pg bcryptjs zod server-only
npm install -D prisma@7.10.1 @types/pg vitest dotenv tsx @types/node@^24
```

- **Pinned versions.** npm's `latest` tag for Prisma pointed at a release candidate (`8.0.0-rc`), so the stable 7.10.1 was pinned explicitly. Don't build a portfolio project on a pre-release.
- **`@types/node@^24`.** Vitest 5 requires Node types 22 or newer, and the machine runs Node 24. Matching the types to the runtime fixed the conflict without `--legacy-peer-deps`.
- **`.gitignore`.** The template ignores `.env*`, which would also hide `.env.example`. Adding `!.env.example` keeps secrets out while committing the template.
- **Next 16 defaults:**
  - `cacheComponents` is on by default. Any component that reads cookies, request data, or the clock must sit inside `<Suspense>`, or the build fails.
  - Middleware is now called **Proxy** (`src/proxy.ts`).
  - The installed docs in `node_modules/next/dist/docs/` match the exact version, so check them before relying on older tutorials.

## 2. Database and Prisma (commit "Add Prisma schema…")

```bash
brew install postgresql@17 && brew services start postgresql@17
createdb equilibria_dev && createdb equilibria_test
npx prisma migrate dev --name init
npx prisma generate
```

- **Prisma 7 changes:**
  - Settings live in `prisma.config.ts`, not `schema.prisma`.
  - The client is generated into `src/generated/prisma`, which is git-ignored and rebuilt by `postinstall`.
  - You connect through a driver adapter (`@prisma/adapter-pg`).
- **`src/lib/db.ts` caches the client on `globalThis`.** In development, Next reloads modules on every edit. Without the cache, each reload opens a new connection pool until Postgres runs out of connections.
- **Schema decisions** (they're commented in `schema.prisma`, and these are good to explain in a review):
  - Dates are `@db.Date`, not timestamps: a log belongs to a day, not a moment.
  - `@@unique([userId, date])` on `DailyLog` means one log per day, enforced by Postgres.
  - `Session.id` stores the SHA-256 hash of the token, never the token itself.
  - Nutrients are 16 typed `Float` columns, not JSON, so Prisma types them and the database rejects nonsense.
  - `PostLike` and `PostFavorite` use composite primary keys, so liking twice is impossible.
  - `MealEntry.food` is `onDelete: NoAction`. A food that logged meals still use can't be deleted (past totals would change). `NoAction` rather than `Restrict` because Postgres checks `NoAction` at the end of the statement, so deleting a user can still cascade through their entries and custom foods together. A test proves this.
  - Cycle length isn't a column. It's derived from start dates, so it can't fall out of sync.

## 3. Pure logic first (commit "Add date, cycle, nutrition, and validation logic…")

Writing the rules as pure functions before any UI meant they could be tested in milliseconds.

- **`src/lib/dates.ts`.** Every date is a `"YYYY-MM-DD"` string, and all math happens in UTC. `new Date("2026-03-08")` in local time can land on the wrong day around daylight-saving changes. UTC math can't, and a test checks the DST weekend.
- **`src/lib/cycles.ts`:**
  - Cycle length is start-to-start.
  - Averages use the last 6 cycles, since recent cycles predict better.
  - Gaps over 90 days are treated as a missed log, so one forgotten month doesn't double the average.
  - The prediction is the last start plus the average length.
  - `isVariable` flags spreads over 7 days.
- **`src/lib/nutrition.ts`.** `NUTRIENTS` is the single list of nutrients, units, and reference values (NIH and FDA, women 19 to 50). The validation schema, the forms, the totals panel, and the USDA import script all loop over it, so adding a nutrient is one line plus a migration.
- **`src/lib/validation.ts`.** zod schemas for every input:
  - The same schema runs in the browser for instant feedback and on the server, because browser checks can be bypassed.
  - `.transform()` normalizes input: lowercase emails, trimmed strings, blank notes become `null`.
  - The password limit is 72 *bytes* because bcrypt ignores the rest.
- **Vitest config** (`vitest.config.mts`) defines two projects:
  - `unit`: parallel, no database.
  - `integration`: one file at a time against the test database.
  - `server-only` is aliased to an empty stub, because outside Next's server bundle it throws on import.

## 4. Authentication (commit "Add session-based authentication API")

Hand-written instead of a library, because the whole flow fits in about 80 lines you can explain line by line:

1. **Signup** (`api/auth/signup/route.ts`):
   - Validate the input.
   - Hash the password with bcrypt, before opening a transaction, so the slow step doesn't hold it open.
   - Create the user and the session in **one transaction**, so a failure can't leave an account you can't sign in to.
   - Rely on the unique email index (catching Prisma error `P2002`) instead of checking "does it exist?" first. That's race-free.
2. **Sessions** (`server/auth/session.ts`):
   - The token is 32 random bytes. The database stores `sha256(token)`.
   - The cookie is `HttpOnly` (page scripts can't read it), `SameSite=Lax` (browsers don't send it on cross-site POSTs, which blocks CSRF), and `Secure` in production.
3. **Login** compares against a dummy hash when the email doesn't exist, so a wrong email and a wrong password take the same time and return the same message.
4. **Logout** deletes the session row, not just the cookie.
5. **`proxy.ts`** only checks that a cookie *exists* and redirects early. It isn't the security boundary. `requireUser()` (pages) and `requireApiUser()` (API) validate against the database on every request.
6. **`server/http.ts` `route()` wrapper:**
   - Checks the `Origin` header on writes (defense in depth on top of SameSite).
   - Converts thrown `HttpError`s, zod failures, and Prisma constraint errors into one JSON error shape.
   - Never leaks a stack trace.

Integration tests (`test/integration/auth.test.ts`) call the real handlers with a `NextRequest`. Route handlers read cookies from `req.cookies` rather than `cookies()` from `next/headers`, so they can run outside Next's runtime.

## 5. A CRUD feature end to end (commit "Add cycle and daily log APIs…")

Every feature follows the same recipe. For periods:

1. Schema: `cycleSchema` in `lib/validation.ts`, which checks that the end isn't before the start, the period is 15 days or fewer, and no date is in the future.
2. Service: `server/services/cycles.ts`:
   - Every query includes `userId`.
   - Delete uses `deleteMany({ where: { id, userId } })` and treats `count === 0` as a 404. Another user's row is indistinguishable from a missing one.
   - Rules that depend on other rows ("no overlaps", "only one ongoing period") run inside a **serializable transaction**. Two simultaneous requests can't both pass the check, because Postgres aborts one (`P2034`), which becomes a 409.
3. Routes: `api/cycles/route.ts` (GET, POST) and `api/cycles/[id]/route.ts` (PUT, DELETE). Each is about five lines.
4. Tests: happy path, validation, conflicts, and another user's ID returning 404.

## 6. Pages with Cache Components (commit "Add dashboard, calendar…")

Every page has the same shape:

```tsx
export default function Page({ searchParams }: PageProps<"/logs">) {
  return (
    <>
      <PageHeader title="Daily log" />          {/* static: prerendered, instant */}
      <Suspense fallback={<LoadingBlock />}>
        <LogsContent searchParams={searchParams} />  {/* per user: streamed in */}
      </Suspense>
    </>
  );
}
async function LogsContent(...) {
  const user = await requireUser();            // reads cookies -> must be in Suspense
  const log = await getLogForDate(user.id, date);
  return <DailyLogForm log={log} />;           // Client Component for interaction
}
```

- **Server Components load data. Client Components handle interaction.** After a mutation, the client calls `router.refresh()`, and the server components re-run with fresh data. No client-side cache to keep in sync.
- **Time zones.** The server only knows UTC, so at 9pm in Boston it already thinks it's tomorrow. `components/timezone-sync.tsx` writes the browser's time zone to a cookie, and `server/today.ts` computes the user's real "today".
- **`await connection()`** in `getToday()` tells Next the clock must be read per request, never baked into a prerender. The dev overlay flagged this, and the fix is from the docs.
- **The calendar** uses `Set`s of period and predicted days for constant-time lookups while drawing 35 to 42 cells.

## 7. Meal tracking and the USDA library (commits "Add USDA food library…" and "Add meal tracking pages")

- **Real nutrition data, not typed from memory.**
  - `scripts/usda-food-selection.ts` lists 99 foods by USDA FDC ID, with friendly names and serving sizes from USDA's portion table.
  - `scripts/build-food-library.ts` streams the 640k-row `food_nutrient.csv` (streamed so it isn't loaded into memory), converts per-100 g values to per-serving values, and writes `prisma/data/foods.json`.
  - Values USDA never measured are recorded as 0 *and listed* in the JSON, so the gap is visible.
- **Seed** (`prisma/seed.ts`):
  - Library foods are upserted with stable IDs (`usda-<fdcId>`), so re-seeding updates them instead of duplicating them.
  - The demo account is deleted and recreated, which cascades to its data.
  - Random choices use a seeded generator, so every run produces the same data.
  - Dates are relative to today, so the demo always looks current.
- **Privacy rule.** Custom foods are visible only to their creator. `visibleTo(userId)` is one reusable `where` clause, and logging a meal checks it, so you can't log against someone else's private food ID.
- **Search UI** debounces requests by 250 ms and ignores responses for a query the user has already changed (the `stale` flag in the effect cleanup).
- **Hydration.** The default meal type (from the time of day) is chosen when you click a food, not during render. Otherwise the server (UTC) and the browser (local time) could render different HTML.

## 8. Meal ideas board and uploads (commit "Add meal suggestions board…")

- **Uploads are untrusted:**
  - `lib/images.ts` identifies files by magic bytes, accepting only JPEG, PNG, and WebP. A renamed `.exe` or an SVG carrying a script gets rejected.
  - The 2 MB cap is checked from `Content-Length` before the server reads the body, and again on the file.
  - Files are stored as `<uuid>.<ext>`. `/api/uploads/[key]` only serves keys matching that exact pattern, which blocks `../../.env`.
  - Responses send `X-Content-Type-Options: nosniff`.
- **Storage is one module** (`server/storage.ts`) with save, read, and delete. Moving to S3 or Vercel Blob means rewriting only that file.
- **No orphaned files.** If the database write fails after a file is saved, the file is deleted. When a photo is replaced, the old file is removed only after the database points at the new one.
- **Authorization.** Editing or deleting someone else's post returns 403. The board is visible to every signed-in user, so there's nothing to hide by returning 404.
- **Idempotent likes.** `PUT /like` upserts and `DELETE /like` uses `deleteMany`, so double-clicking or retrying is harmless. The UI is optimistic: it updates immediately and rolls back if the server says no.
- **The browse filter is a plain `<form method="get">`.** It works without JavaScript, and every filtered view has a shareable URL.

## 9. Insights (commit "Add insights page")

`lib/insights.ts` tags each logged day with a phase: during a period, the 5 days before one, or other days. It then ranks symptoms within each phase. The page also shows cycle stats and a 7-day nutrient average, which skips days with no meals logged so a forgotten day doesn't look like fasting.

## 10. CI, README, and verification

- **`.github/workflows/ci.yml`** starts a Postgres 17 service container, then runs `npm ci`, lint, typecheck, `npm test`, and `npm run build`.
- **Fresh-clone check.** Before pushing, the repo was cloned into an empty folder and the exact CI commands were run against a brand-new database. That caught one real bug: Prisma's `env()` helper throws when `DATABASE_URL` is missing, which broke `npm install` on a fresh clone. `prisma.config.ts` now reads `process.env.DATABASE_URL` directly.
- **Manual checks in a browser:**
  - signup, login, the redirect to `/login?next=…`
  - every CRUD flow, overlap errors shown next to the right field
  - photo upload and display, likes
  - 375 px mobile width with no horizontal scroll

## Questions a reviewer might ask

- **Why not NextAuth or Auth.js?** Email and password sessions are small enough to write and test directly, and every security property is visible in two files. For OAuth providers, a library would be the right call.
- **Why REST route handlers instead of Server Actions?** The resume project calls for a reusable API. The same endpoints work from any client and are easy to integration-test with plain `Request` objects.
- **How do you stop user A from reading user B's data?** Every service query filters by the session's `userId`, and tests try exactly that, expecting 404s.
- **What happens if two requests race?**
  - Daily logs and likes: unique indexes and composite keys reject the duplicate.
  - Periods: a serializable transaction aborts one of the two.
  - Signup: the unique email index rejects the second account.
- **What would you do next?**
  - the education tab
  - password reset and email verification
  - rate limiting on login
  - object storage for photos
  - end-to-end browser tests (Playwright)
