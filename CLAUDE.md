# CLAUDE.md

GoTrend — an AI image generation platform where a user picks a trending style template, uploads a photo, and gets a generated image. Product scope is in the [README](README.md).

## Read these first

The rulebooks are binding, not advisory. Read the one covering the area you are about to touch before writing code.

| Rulebook                                        | Covers                                                          |
| ----------------------------------------------- | --------------------------------------------------------------- |
| [global.md](docs/rulebooks/global.md)           | File naming, no comments, type checking, structure, secrets      |
| [frontend.md](docs/rulebooks/frontend.md)       | Pages, components, hooks, client data access, theme, mobile-first |
| [backend.md](docs/rulebooks/backend.md)         | Route handlers, domain, repositories, Gemini, Blob, uploads      |
| [git.md](docs/rulebooks/git.md)                 | Branches, commits, history                                       |

Architecture decisions are in [docs/adr/](docs/adr/), starting with [ADR-0001: Tech Stack](docs/adr/0001-tech-stack.md). A decision recorded there is settled — do not re-litigate it in code. If a rule genuinely blocks the work, say so and propose a new ADR rather than quietly working around it.

## Stack

Next.js 15 (App Router) on Vercel · Turso (libSQL) + Drizzle · Vercel Blob · Google Gemini · Auth.js v5 · Tailwind v4 · Zod · TanStack Query via `react-query-kit` · react-hook-form · framer-motion · Yarn 4.

One app, one deployment. Route handlers under `app/api/` are the API; there is no separate server.

## The rules that get broken most

These are the ones worth stating twice, because they are non-obvious or easy to violate by habit:

1. **No comments.** Only `// TODO:`, `// FIXME:`, `// HACK:`, and tooling directives. Explanations go in a name, a commit message, an ADR, or this file.
2. **Every filename is kebab-case.** Vercel builds on Linux; a casing-only difference works locally and breaks CI.
3. **No file exceeds 150 lines.**
4. **Mobile first at 320 px.** Unprefixed Tailwind is the mobile layout; `sm:`/`md:`/`lg:` only add to it. Never patch a desktop layout with `max-*`.
5. **Never commit without explicit approval for that specific batch.** One file per commit.
6. **Search before you write.** A second implementation of something that exists is the most expensive mistake here.
7. **Types and schemas are never declared beside the code that uses them** — `types/` and `schemas/`, grouped by domain, shared by frontend and backend.

## Non-obvious constraints

Learned or platform-imposed facts that are not visible in the code. These have bitten or will bite.

**Generation has a 60-second ceiling.** Vercel Hobby functions stop at 60s. One Gemini image takes 5–20s and fits; anything more does not. There is no queue.

**The generation row is written before Gemini is called.** `INSERT … status 'pending'` first, then call the provider, then update. This is what replaces a queue: a timeout or crash leaves a recorded attempt rather than losing the user's work silently. Getting this order wrong is invisible until something times out in production.

**The client polls; it never holds a request open.** A dropped connection must not destroy a result. A `pending` row older than the timeout ceiling is reported as `failed` when read — there is no reaper process, because there is no background process.

**Gemini free-tier 429s are normal, not exceptional.** Rate limits are hit in ordinary use. A 429 is its own retryable error type and surfaces as "try again in a moment". Never let it read as a crash or a generic failure.

**Turso caps a row at ~1MB and meters rows read.** Image bytes never go in the database — they go to Vercel Blob, which returns a CDN URL stored on the row. The single documented exception is template thumbnails under 100KB ([ADR-0001](docs/adr/0001-tech-stack.md)). SQLite *can* store images; Turso is the wrong place to do it for this product, and the ADR explains why.

**libSQL has a single writer.** Batch related writes into one transaction; concurrent writers contend.

**SQLite has no `jsonb` and no boolean.** JSON is `TEXT` with `CHECK (json_valid(col))`, parsed through Zod on read. Booleans are integers. Both are mapped to domain shapes in the repository — never outside it.

**Deletes remove the row first, the blob second.** An orphaned blob is cheap; a row pointing at a deleted blob is a broken image in someone's history.

**Middleware is not an authorization boundary.** It gates `/admin/*` for redirects. Every admin route handler re-checks the role itself.

**`next/image` needs the Blob hostname configured** in `next.config.ts`, or every generated image fails to render.

**Prompts live in template rows, not in code.** They are admin-managed product content. A literal prompt string in a handler is product copy in the wrong place.

## Commands

```
yarn dev         local development
yarn build       production build (runs ts:check)
yarn ts:check    type check — must pass
yarn lint        lint
yarn test        unit tests
```

## Working agreements

- Verify before reporting done. A change to an upload path, a route handler, or a migration is verified against a running app or a preview deployment, not by reading the diff.
- If a rulebook and a request conflict, say so before writing the code rather than silently picking one.
- When something non-obvious is learned — a provider quirk, a platform limit, a footgun — add it to the constraints above in the same change that discovered it.
