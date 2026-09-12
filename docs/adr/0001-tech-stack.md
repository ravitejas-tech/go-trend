# ADR-0001: Tech Stack

- **Status:** Accepted
- **Date:** 2026-09-12
- **Deciders:** GoTrend maintainers

---

## Context

GoTrend lets a user pick a trending style template, upload a photo, and get back an AI-generated image ([README](../../README.md)). The MVP needs a landing page, template browsing by category, image upload, AI generation, download, generation history, user and admin authentication, and an admin panel for template and prompt management.

Three constraints drove every choice below, and they are not negotiable at this stage:

1. **No budget.** Free tiers only. Anything that requires a paid plan to function is out, and a design that silently depends on a paid tier is worse than one that admits its limits.
2. **No separate server deployment.** One `git push`, one deployment, one platform to operate. The project has no ops capacity.
3. **No background job infrastructure.** No queue service, no worker fleet, no cron dispatcher to run and pay for.

The third constraint is the interesting one, because AI image generation is slow — 5–20 seconds with Gemini — and the obvious architecture for slow work is a queue. We do not get a queue. What follows is how the rest of the stack is shaped around that.

---

## Decision

| Concern           | Choice                                          |
| ----------------- | ----------------------------------------------- |
| Framework         | **Next.js 16**, App Router, TypeScript strict   |
| Hosting           | **Vercel** (Hobby)                              |
| Database          | **Turso** (libSQL / SQLite)                     |
| Database access   | **Drizzle ORM** + plain SQL migrations          |
| Image bytes       | **Vercel Blob**                                 |
| AI generation     | **Google Gemini** (free API key)                |
| Auth              | **Auth.js v5** (`next-auth`), database sessions  |
| Styling           | **Tailwind CSS v4**                             |
| Validation        | **Zod**                                         |
| Forms             | **react-hook-form** + Zod                       |
| Server state      | **TanStack Query** via `react-query-kit`         |
| Client state      | Local state and URL params; **Zustand** only for true global state |
| Animation         | **framer-motion**                               |
| Package manager   | **Yarn 4**                                      |

### One Next.js app, no separate API

The user site, the admin panel, and the API are one Next.js application deployed to Vercel. Route handlers under `app/api/` are the API; there is no second service.

This satisfies the no-separate-deployment constraint directly. It also means the frontend and backend share `types/`, `schemas/`, and constants by import rather than by duplication — a template shape defined once is the same shape on both sides of the wire, which is the single biggest source of drift in a split codebase.

The cost is that the "backend" has no framework-enforced structure. Next.js is a router, not an architecture. The [backend rulebook](../rulebooks/backend.md) therefore enforces layering by convention and review, and that rulebook is load-bearing rather than advisory.

### Generation is synchronous, but the work is always persisted

There is no queue. A generation request runs inside the Vercel function that received it:

```
POST /api/generations
  → validate, check the user owns a quota
  → INSERT a generations row with status 'pending'
  → call Gemini
  → upload the result to Blob
  → UPDATE the row to 'succeeded' with the output URL
  → respond
```

Vercel's Hobby plan caps a function at **60 seconds**. Gemini image generation takes 5–20 seconds, so this fits with real headroom — but "fits with headroom" is not "cannot fail", and the row is what makes failure survivable.

**The row is written before the provider is called, not after.** This is the rule that replaces having a queue:

- A function timeout, a crash, or a user closing the tab leaves a `pending` row, not a silent loss. The user's history shows the attempt.
- The client polls `GET /api/generations/:id` rather than holding an open request. A dropped connection does not destroy the result, because the result lands in the database regardless of who is still listening.
- A row stuck in `pending` past a timeout ceiling is reported as `failed` on read. There is no reaper process, because there is no process — the staleness check happens when someone looks.

**Generation is never triggered from a page render or a server component.** It is a mutation, it happens in a route handler, and it is initiated by an explicit user action. A slow provider call in a render path blocks a page; in a route handler it blocks one request.

If generation later needs to exceed 60 seconds — multiple outputs per request, video, a slower model — that is a new ADR, and the persisted-row design is what makes adding a queue later a change to one layer instead of a rewrite.

### Turso for rows, Vercel Blob for image bytes

Both are on the free tier and neither needs an account outside what Vercel and Turso already give us.

**Turso holds metadata only**: users, templates, categories, prompts, generation rows, and the Blob URLs pointing at the actual images.

**Vercel Blob holds every image byte**: uploaded source photos and generated outputs. Blob returns a public CDN URL that the browser fetches directly.

SQLite *can* store images — `BLOB` is a first-class type, and the SQLite authors document blobs under ~100KB being [faster than the filesystem](https://www.sqlite.org/fasterthanfs.html). We considered it seriously and rejected it for images, for four reasons specific to Turso and to this product:

1. **Row size.** Turso caps a row at roughly 1MB. A phone photo is 2–6MB and a Gemini output is 1–2MB, so most real images do not fit in a row at all. Chunking each image across rows and reassembling it is writing a filesystem inside a database.
2. **The quota that actually binds is rows read.** Turso's free tier meters rows read, and a blob row is read every time the image is served. Serving images would compete for quota with the queries that do real work, and 5GB of storage is a few thousand images.
3. **libSQL has a single writer.** Multi-megabyte writes through one writer stall template reads and admin queries. Blobs make write contention meaningfully worse.
4. **No CDN, and images are the one thing that must be cached.** A blob in Turso travels Turso → Vercel function → browser, costing a function invocation per view and defeating URL-based caching. A Blob URL is cached at the edge and costs us nothing to serve.

The shape of the data settles it: GoTrend's images are large, immutable, served many times, and never queried by content. That is what object storage is for.

**The documented exception:** template preview thumbnails may be stored as `BLOB` in Turso when resized to under 100KB. There are a few dozen of them, they load on every page, and they sit in the range where SQLite genuinely wins. Any image that is user-generated or not thumbnail-sized goes to Blob. This exception is not a precedent for anything else.

### Drizzle, with hand-written SQL migrations

Drizzle gives typed queries over libSQL with no runtime weight and no code generation step. Migrations are plain, numbered, reviewable, forward-only SQL files that stay immutable once applied — not ORM-generated files nobody reads.

The SQLite constraints that follow from this are rules, not trivia, and the [backend rulebook](../rulebooks/backend.md) states them: there is no `jsonb`, so JSON is `TEXT` guarded by `CHECK (json_valid(col))` and parsed through Zod on read; there is no native boolean, so booleans are integers mapped at the repository boundary; and timestamps are UTC ISO-8601 strings.

### Gemini, behind an adapter

Generation calls Gemini's image model with the prompt stored on the template. The free API key has per-minute and per-day rate limits, which are treated as expected operating conditions rather than exceptional ones: a rate-limit response is a distinct, retryable error type, and it surfaces to the user as "try again in a moment", never as a generic failure.

The provider is reached through one module with a narrow interface — build a request from a template and a source image, map a response to an output image or a typed error. Nothing in `domain/` imports the Gemini SDK. This is not speculative abstraction; it is the same boundary that lets the provider be swapped, stubbed in tests, and rate-limit-accounted in one place.

### Auth.js with database sessions

One auth system covers both audiences. A `role` column (`user` | `admin`) distinguishes them, admin routes are gated by middleware on `/admin/*` and re-checked in every admin route handler, and there is no separate admin login. Database sessions rather than JWT, because a role change or a ban must take effect immediately rather than at token expiry.

**A middleware check is never the only check.** Every admin route handler verifies the role itself. Middleware is a convenience for redirects, not an authorization boundary.

---

## Consequences

**Good**

- One deployment, one platform, one `git push`. No ops.
- Entirely free tier at MVP scale.
- Types, Zod schemas, and constants are shared by import across frontend and backend — no wire-shape drift.
- Persisting the generation row before calling the provider means no queue is needed now, and adding one later touches one layer.
- Images served from a CDN at no compute cost.

**Bad, and accepted**

- **60 seconds is a hard ceiling** on anything a user waits for. It is adequate for one image and rules out batch generation, video, and slow models without a new ADR.
- **No framework-enforced backend structure.** The [backend rulebook](../rulebooks/backend.md) is the only thing holding layering in place.
- **Free-tier rate limits are a product constraint.** Gemini's quotas cap concurrent users, and hitting them is a user-visible state that has to be designed for, not an error to hide.
- **Single-writer database.** Write-heavy admin operations and generation writes contend; batch related writes into one transaction.
- **Two storage systems** mean an orphaned blob is possible when a row write fails after an upload succeeds. Deletes remove the row first and the blob second, and a blob with no row is harmless and cheap.
- **Vercel and Turso lock-in** at the storage and hosting layer. Drizzle keeps the query layer portable; Blob URLs would need migrating.

---

## Alternatives considered

**Cloudflare Workers + Hono + R2 + Queues.** The architecture the rulebooks in this repo were originally written for. Rejected: a 10ms CPU limit per invocation and the free-tier-only constraint fight image work constantly, and it reintroduces a second deployment. R2's 10GB free storage and zero egress are genuinely better than Vercel Blob's, but not worth a second platform to operate.

**Postgres (Neon/Supabase) instead of Turso.** Better concurrency, real `jsonb`, no row-size ceiling. Rejected on budget: free Postgres tiers suspend on inactivity or expire, and Turso's free allowance is more durable for a project with no spend.

**A queue for generation (Inngest, QStash, Trigger.dev).** The textbook answer for slow work, and all three have free tiers. Rejected for MVP: 60 seconds covers one Gemini image comfortably, and a queue adds a service, a webhook surface, and local-development complexity to solve a problem we do not yet have. The persisted-row design is deliberately queue-shaped so this decision can be revisited cheaply.

**Next.js 15.** Superseded during scaffolding: `create-next-app` installs 16.x, which is current. Pinned to 16.3.4 rather than 16.3.5 because Yarn 4 quarantines packages published within three days, and 16.3.5 was a day old.

**Separate React Router frontend + Node API.** Matches the two-rulebook split these rulebooks came from. Rejected: two deployments, and it forces the type duplication that a single app avoids.

---

## References

- [README](../../README.md) — product scope and MVP
- [Global rulebook](../rulebooks/global.md)
- [Frontend rulebook](../rulebooks/frontend.md)
- [Backend rulebook](../rulebooks/backend.md)
- [Git rules](../rulebooks/git.md)
- [SQLite: 35% Faster Than The Filesystem](https://www.sqlite.org/fasterthanfs.html)
