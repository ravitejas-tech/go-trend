# Backend Rulebook

Rules for the server side of the app — route handlers, domain logic, repositories, and the Gemini and Blob integrations (Next.js route handlers on Vercel, Turso, Drizzle — see [ADR-0001](../adr/0001-tech-stack.md)). These exist so both humans and AI agents can navigate the codebase by convention alone.

Next.js is a router, not an architecture. A framework like NestJS would have enforced structure for us; route handlers will not. Everything here is therefore enforced by review and lint rather than by the framework, which makes it more important to follow, not less.

Read the [global rules](global.md) first — file naming, no comments, type checking, structure, and secrets all apply here in full.

---

## Layout

```
app/api/**/route.ts    HTTP surface only
domain/                business logic, plain functions
repositories/          every database call
providers/             Gemini and Vercel Blob
lib/                   errors, env, auth, quota, logging, utils, constants
types/                 shared types, grouped by domain
schemas/               Zod schemas, grouped by domain
db/                    Drizzle client, schema, migrations
```

---

## No comments (non-negotiable)

Identical to the [global rule](global.md#no-comments), and it applies here in full — route handlers, domain functions, migrations, and `next.config.ts` included.

One backend-specific note: the temptation to explain a non-obvious Gemini or Turso quirk in a comment is strong and still not allowed. That knowledge goes in [CLAUDE.md](../../CLAUDE.md) or an [ADR](../adr/) — a named function like `geminiReturnsInlineBase64()` carries it better than prose anyway.

---

## File naming (non-negotiable)

**Every backend file is kebab-case**, per the [global rule](global.md#file-naming). App Router files keep the names the framework requires — `route.ts` is `route.ts`.

Exports keep their conventional casing: a type is `PascalCase`, a function `camelCase`, a constant `SCREAMING_SNAKE`.

---

## Types, schemas, and code are separate (non-negotiable)

The same segregation the [frontend rulebook](frontend.md#application) requires, and for the same reason: a type declared beside the function that happens to use it first is a type the next caller cannot find, so the next caller writes it again.

- **Types live in `types/`**, grouped by domain — one file per domain (`template.ts`, `generation.ts`, `user.ts`, `category.ts`), not one per consumer. A repository, a route handler, an admin page, and the provider adapter that all talk about a template import the _same_ `Template`.
- **Zod schemas live in `schemas/`**, grouped the same way, and never in `lib/`. A schema is runtime code that emits a validator; a type is a declaration that vanishes at build time. They are different things with different lifetimes, so they do not share a file.
- **Infer, never restate.** A shape a schema already describes is obtained with `z.infer`, and a shape derived from another is built with `Pick`, `Omit`, and `Partial`. Two hand-written definitions of one shape will disagree, and the disagreement will surface as a bug in production rather than a type error.
- **`domain/` imports types, never schemas.** Domain logic operates on shapes; it does not validate. Validation happens at the boundary that admits the data — a route handler, an upload, a Gemini response — and the parsed result is handed inward. A domain function importing from `schemas/` means a boundary was missed.

Because frontend and backend are one app, these are the same `types/` and `schemas/` the client imports. A shape defined here is the wire contract; there is no second copy on the other side.

---

## Rows never leave the repository (non-negotiable)

A database row is a driver detail: snake_case columns, integers standing in for booleans, JSON kept as `TEXT` because SQLite has no `jsonb` ([ADR-0001](../adr/0001-tech-stack.md)). None of that is allowed to escape.

- **A `*Row` type is private to its repository module.** It is not exported, not imported by a route handler or a component, and never named in a response.
- **Repositories return domain types.** The row → domain mapping (`is_published === 1` to `isPublished`, `parseJsonColumn` to a real array, `preview_url` to `previewUrl`) happens in the repository, once, next to the query that produced the row. A handler that writes `row.preview_url` is doing the repository's job in the wrong layer, and it will drift the moment a second handler needs the same shape.
- **The Drizzle client and `db/` helpers are repository-only imports.** A route handler, a server component, or a domain function importing from `db/` is reaching past a layer. There are no exceptions for "just one quick query" in a page.
- **Serialization is not mapping.** A handler may pick fields for a response; it may not translate storage encodings into meaning.

---

## Layers, precisely

`route handlers → domain → repositories` is one-directional and has no shortcuts.

- **`app/api/**/route.ts`** — HTTP only: parse, validate, authorize, call a domain function, shape a response. No business logic. No SQL. Ever.
- **`domain/`** — business logic as plain functions. **Imports neither `next/*` nor the Gemini SDK nor Drizzle.** This is what makes it testable without a request and portable if the platform changes. A domain function receiving a `Request` or a `NextResponse` is a bug.
- **`repositories/`** — every database call in the codebase. Returns domain types, never raw driver rows.
- **`providers/`** — Gemini and Blob, each behind a narrow interface. Nothing else in the codebase imports their SDKs.
- **`lib/`** — cross-cutting only: errors, env parsing, auth helpers, quota accounting, logging, generic utils, constants. Not a home for schemas or types.

**Server components read through repositories, never around them.** A server component may call a repository function directly — it is server code, and an HTTP round trip to our own API would be waste. What it may not do is issue its own query, hold business logic, or bypass an authorization check a handler would have made. Anything a server component and a route handler both need lives in `domain/` or a repository, and both call it.

**Mutations are route handlers.** Reads may go through server components; writes go through `app/api/` so there is one audited surface for validation, authorization, quota, and error mapping.

---

## Reusability (non-negotiable)

The [frontend rulebook's reusability section](frontend.md#reusability-non-negotiable) applies here in full — search before you write, second occurrence gets extracted, extend rather than clone, leave no duplicate behind, and the one exception for things that merely resemble each other.

What those rules look like on the backend:

- **Repeated SQL becomes a repository function.** The same query written in two places will drift. One query, one named function, imported.
- **Repeated validation becomes a shared schema.** Schemas in `schemas/` are imported by handlers, domain tests, and the forms that post to them. A shape defined twice will disagree eventually.
- **Types are composed, not retyped** — `Pick`, `Omit`, `z.infer` from the source of truth. An admin's template-update payload is derived from `Template`, not hand-written beside the handler.
- **Constants declared once.** Generation statuses, user roles, category slugs, upload size and MIME limits, Gemini model ids, quota ceilings, polling intervals. Never a string literal repeated across files.
- **Error types are shared.** One error taxonomy in `lib/errors.ts`, used by every layer.
- **One authorization helper.** The admin check is a single function used by every admin handler, never re-implemented per route.

---

## Platform constraints are rules, not trivia

These come from [ADR-0001](../adr/0001-tech-stack.md). Code that ignores them passes review locally and fails in production.

- **60 seconds per function invocation** on Vercel Hobby. One Gemini image fits with headroom; two sequential ones do not. Anything that cannot finish inside the budget does not belong in a request.
- **The generation row is written before the provider is called.** This is the rule that replaces having a queue. `INSERT … status 'pending'`, then call Gemini, then update the row. A timeout or a crash then leaves a recorded attempt instead of a silent loss.
- **Never hold a request open waiting for a result the client could poll for.** The client polls the generation row. A dropped connection must not destroy work.
- **A `pending` row older than the timeout ceiling reads as `failed`.** There is no reaper process, because there is no background process — staleness is evaluated when the row is read.
- **Gemini free-tier rate limits are an expected operating condition.** A 429 is a distinct, retryable error that surfaces as "try again in a moment", never as a generic failure and never as a crash.
- **libSQL has a single writer.** Batch related writes into one transaction; concurrent writers contend.
- **Turso caps a row at ~1MB.** Image bytes go to Blob. The only images in the database are template thumbnails under 100KB, per the documented exception in [ADR-0001](../adr/0001-tech-stack.md).
- **Work is idempotent or it is wrong.** A client that retries a generation must not produce two charges against quota or two orphaned blobs.

---

## Generation

- **One module owns the Gemini call.** `providers/gemini.ts` builds the request from a template prompt and a source image and maps the response to an output image or a typed error. Nothing else imports the SDK.
- **Every Gemini response is parsed with Zod.** A provider that changes its shape must fail loudly at the parse, not silently produce a broken generation row.
- **The prompt comes from the template row.** Never a literal prompt string in a handler or a domain function — prompts are admin-managed content ([README](../../README.md)), and hardcoding one puts product copy in code.
- **Status is a closed set** — `pending`, `succeeded`, `failed` — declared once as a constant and used by the database, the domain, and the UI. A generation row always carries a status; there is no implicit success.
- **A failed generation records why.** A typed error code and a user-safe message on the row. "Something went wrong" with nothing stored is not a failure state, it is a lost bug report.
- **Quota is accounted, not assumed.** Anything consuming Gemini's free-tier budget checks the ceiling before spending and records usage after. Exceeding a ceiling degrades behaviour with a clear message; it does not throw and lose the work.

---

## Uploads and storage

- **Validate before storing.** Size, MIME type, and actual decodability are checked at the boundary. A declared `Content-Type` is a client's claim, not a fact; never trust the filename extension.
- **Uploads go straight to Blob, never through a function body when it can be avoided.** Use a client upload with a server-issued token so multi-megabyte bodies do not consume function time and memory.
- **Blob URLs are stored on the row; blob paths are never rebuilt from parts.** A URL derived by string-concatenating a base and an id breaks the first time the storage layout changes.
- **Deletes remove the row first, the blob second.** An orphaned blob is harmless and cheap; a row pointing at a deleted blob is a broken image in someone's history.
- **A user's images are private to that user.** Every read of a generation row checks ownership, or admin role. Unguessable URLs are not authorization.

---

## Application

- **Handlers are thin:** validate → authorize → call domain → map to response. A route handler longer than a screen is doing something that belongs in `domain/`.
- **Validation:** Zod at every boundary — request bodies, query and route params, form data, uploaded file metadata, and **every Gemini response**.
- **Authorization is explicit and repeated.** Middleware gates `/admin/*` for redirects; every admin route handler re-checks the role itself. Middleware is a convenience, not an authorization boundary.
- **Database access only in `repositories/`.** Parameterized queries only — never string-interpolate a value into SQL, including in a raw Drizzle escape hatch.
- **JSON columns:** Turso has no `jsonb`. JSON is `TEXT`, guarded with `CHECK (json_valid(col))`, and parsed through a Zod schema on read. Never trust a stored blob's shape.
- **File size cap:** no file exceeds **150 lines**, same as the frontend rulebook. A provider module past that is mixing request building, parsing, and error mapping — split them.
- **Errors:** typed errors from `lib/errors.ts`, distinguishing retryable (network, timeout, Gemini 429) from terminal (invalid upload, unknown template, malformed response). Only retryable errors are retried. Never swallow an error silently, and never catch-and-continue without recording it. An internal error message is never returned to a client verbatim.
- **Logging:** structured objects, never string concatenation. Every generation logs generation id, template id, user id, provider, duration, status, and error code.
- **Time:** always UTC, always ISO-8601 strings in the database.
- **Migrations:** plain, reviewable, forward-only SQL files, numbered and immutable once applied. No ORM-generated migrations that nobody reads.
- **Caching:** template and category reads are cacheable and should be; anything user-scoped — history, generation status, admin data — is never cached at the edge. A cached generation status is a user watching a stale spinner.
- **Testing:** `domain/` is pure and gets unit tests with no request and no network. The Gemini adapter is tested against captured fixture responses, not the live API — the free-tier quota is for users, not for the test suite.
