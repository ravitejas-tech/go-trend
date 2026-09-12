# Global Rules

Applies to every file in this repository — the Next.js app, route handlers, config, and migrations alike. The stack these rules assume is fixed by [ADR-0001](../adr/0001-tech-stack.md).

## File naming

All files use **kebab-case**. No exceptions.

```
template.ts             create-template.ts
generation-status.ts    admin-guard.ts
template-card.tsx       use-generation-poll.ts
```

Not `TemplateCard.tsx`, `templateCard.tsx`, `useGenerationPoll.ts`.

Linux is case-sensitive and Vercel builds on Linux; mixed naming breaks imports in CI while working fine on Windows and macOS. One convention removes that class of bug and removes the per-file judgement call.

Exports keep their conventional casing — a component is `PascalCase`, a hook starts with `use`, a constant is `SCREAMING_SNAKE`. Only filenames and directories are kebab-case.

Next.js App Router files keep the names the framework requires: `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`, and dynamic segments like `[id]` or `[...slug]`.

## No comments

Explanatory comments and JSDoc blocks are not written here. Only these are allowed:

| Allowed            | Example                                              |
| ------------------ | ---------------------------------------------------- |
| Actionable markers | `// TODO:`, `// FIXME:`, `// HACK:`                  |
| Tooling directives | `// eslint-disable-next-line`, `// @ts-expect-error` |

Code carries meaning through names, types, and structure. If prose is needed to follow it, rename the thing or split it.

Knowledge that cannot live in code goes in the commit message (why a change happened), an [ADR](../adr/) (a decision and its rationale), or [CLAUDE.md](../../CLAUDE.md) (a non-obvious constraint).

This applies with full force to the two areas where the temptation is strongest: a Gemini API quirk and a SQLite/Turso limitation. Neither gets a comment. A named function — `geminiRejectsImagesOver4Mb()`, `toDomainTemplate()` — carries that knowledge better than prose, and the durable version of it belongs in an ADR.

## Say it in less code

**Ten lines that read clearly beat fifty that spell out the same thing.** Before writing a block, ask whether the language already does it.

Repeated assignment from one object to another is the common case — that is `Object.assign`, not eleven lines:

```ts
Object.assign(template, body);
```

Not:

```ts
template.title = body.title;
template.description = body.description;
template.prompt = body.prompt;
```

The same instinct applies throughout: map/filter/reduce over a hand-rolled loop that pushes into an array, destructuring over a run of property reads, a lookup object over a chain of `if`s comparing one value, spread over field-by-field copying.

This is about mechanical repetition, not compression for its own sake. Never collapse distinct logic into a dense one-liner to save space — if the short version hides a branch that matters, keep it explicit. Fewer lines is the result of removing repetition, never the goal itself.

## Types are checked

**`yarn ts:check` must pass. `yarn build` runs it, so a type error fails the build.**

Type errors are not warnings to clear up later — a `possibly undefined` that reaches production is a blank page for whoever hits that route.

Fix the source rather than each call site. A cluster of `possibly undefined` errors is usually one badly typed value seen from many places, and correcting that value clears the cluster without a single defensive check.

Do not silence an error with `@ts-ignore`, `any` or a non-null `!`, and do not loosen a compiler flag to make one go away. `strict` is on and stays on. Every boundary that admits outside data — a request body, a Gemini response, a database row, an uploaded file — is typed `unknown` and parsed with Zod.

## Structure

- One file = one responsibility
- Never mix UI, logic, types, and constants in one file

A file named for a handler, component, or service contains _that thing only_. Constants, generic helpers and types declared at the top of it are a second responsibility that has moved in — they belong in a shared location from the moment they are written, not once a second caller appears.

| What it is                                                          | Where it goes                        |
| ------------------------------------------------------------------- | ------------------------------------ |
| Generic helper, no domain knowledge (`pickDefined`, date formatting) | `lib/utils/`, as `<topic>.ts`        |
| Domain constant — field lists, option sets, limits                  | `lib/constants/`, as `<topic>.ts`    |
| Enum or union of literals                                           | `lib/constants/`, beside its domain  |
| Shared type                                                         | `types/`, one file per domain        |
| Zod schema                                                          | `schemas/`, one file per domain      |

Because the frontend and the API are one deployment ([ADR-0001](../adr/0001-tech-stack.md)), these folders are shared by both. A template shape is defined once and imported by a route handler, a server component, and a client component. That shared definition is the main reason the stack is a single app, so duplicating a shape across the wire boundary defeats the choice.

**A barrel file only re-exports.** An `index.ts` that also declares a constant is mixing responsibilities — move the declaration to a named file beside it and re-export that.

Do not wait for duplication to justify the move. A field list sitting in a route handler is already in the wrong file, even with one caller: the next feature that needs it either imports from a handler or, more likely, retypes it.

## Imports

**Use the `@/` alias, never a relative path that climbs.** `@/lib/errors` reads the same from every file and survives a move; `../../lib/errors` does not. Within one module a sibling import is still written `@/`-absolute, for consistency.

## Secrets

Environment variables only, and never committed — `.env.local` is gitignored, and production values live in Vercel's environment settings.

The Gemini API key, the Turso auth token, the Blob token, and the Auth.js secret are **server-only**. A secret prefixed `NEXT_PUBLIC_` is shipped to the browser, so that prefix is never applied to any of them. Generation is always called from a route handler, never from the client, precisely so the key stays on the server.

Environment variables are parsed once through a Zod schema at startup and imported from there. Never read `process.env` in a component, a handler, or a repository — a missing variable must fail at boot with a named error, not as `undefined` in the middle of a request.
