# Frontend Rulebook

Rules for the client side of the app — pages, components, hooks, and client data access (Next.js 15 App Router, TypeScript, Tailwind v4 — see [ADR-0001](../adr/0001-tech-stack.md)). These exist so both humans and AI agents can navigate the codebase by convention alone.

Read the [global rules](global.md) first — file naming, no comments, type checking, structure, and imports all apply here in full.

---

## Layout

```
app/                   routes, layouts, pages (App Router)
components/<feature>/  feature components
components/ui/         shared primitives
hooks/                 use* hooks
api/                   createQuery / createMutation factories
lib/constants/         static data and constants
types/                 shared types, grouped by domain
schemas/               Zod schemas, grouped by domain
```

`types/`, `schemas/`, and `lib/constants/` are the same folders the [backend](backend.md) uses. That sharing is the reason the stack is one app ([ADR-0001](../adr/0001-tech-stack.md)) — a template shape is imported, never re-declared client-side.

---

## No comments (non-negotiable)

**Explanatory comments and JSDoc blocks are not written in this codebase.** Not in components, not in route handlers, not in config. A pull request that adds one does not pass review.

Allowed, and only these:

| Allowed            | Example                                                  |
| ------------------ | -------------------------------------------------------- |
| Actionable markers | `// TODO: …`, `// FIXME: …`, `// HACK: …`                |
| Tooling directives | `// eslint-disable-next-line …`, `// @ts-expect-error …` |

Everything else — describing what a component does, why a prop exists, what a block is for, `/** … */` blocks above functions — is removed.

Code carries its meaning through names, types, and structure. If a reader needs prose to follow it, the fix is to rename the thing, split the component, or extract a named hook — not to explain it in place.

Knowledge that genuinely cannot live in code still gets written down, just not beside the code: a non-obvious constraint or tooling gotcha goes in [CLAUDE.md](../../CLAUDE.md), a decision and its rationale goes in an [ADR](../adr/), and the reason for a specific change goes in the commit message.

---

## File naming (non-negotiable)

**Every file is named in `kebab-case`.** Components, hooks, utilities, types, static data, and route modules alike.

| Kind         | File                      | Exports              |
| ------------ | ------------------------- | -------------------- |
| Component    | `template-card.tsx`       | `TemplateCard`       |
| UI primitive | `image-drop-zone.tsx`     | `ImageDropZone`      |
| Hook         | `use-generation-poll.ts`  | `useGenerationPoll`  |
| Data         | `template-categories.ts`  | `TEMPLATE_CATEGORIES`|

Only the _filename_ is kebab-case — exports keep their conventional casing, so a component is still `PascalCase` and a hook still starts with `use`. A file named `TemplateCard.tsx` or `useGenerationPoll.ts` fails review.

**Directories are kebab-case too**, so a feature folder is `components/template-gallery/`, never `components/templateGallery/`.

App Router files keep the names the framework requires — `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `[id]`, `(group)` — and stay kebab-case around them: `app/templates/[slug]/page.tsx`, `app/admin/templates/new/page.tsx`.

The reason is that Windows and macOS treat `Button.tsx` and `button.tsx` as the same file while Linux and CI do not, so a casing-only rename goes unnoticed locally and breaks the Vercel build. One casing convention removes that class of bug, and removes the per-file judgement call.

---

## Server and client components

- **Server is the default.** A component gets `"use client"` only when it needs state, an effect, an event handler, or a browser API. A page that only renders fetched data stays a server component.
- **`"use client"` goes on the leaf, not the branch.** Marking a page or layout as client pulls its whole subtree into the bundle. Push the boundary down to the interactive piece — a gallery grid can be a server component with client-side filter controls inside it.
- **Server components read through repositories** ([backend rulebook](backend.md#layers-precisely)), never with their own queries, and never by fetching our own API over HTTP.
- **Mutations are client-side through `api/`.** Uploading an image, starting a generation, and every admin write go through a route handler.
- **A secret never crosses the boundary.** The Gemini key, Turso token, and Blob token are server-only ([global rules](global.md#secrets)). A client component that would need one is a design error — move the work to a handler.

---

## Global

- **One file = one responsibility.** Don't mix UI, logic, types, and constants in one file.
- **The image is the product.** GoTrend sells a visual result, so imagery leads and chrome recedes. Template previews and generated outputs are rendered at the largest size the layout allows, never cropped in a way that hides the effect the template is selling, and never placed behind a heavy overlay. A gallery is a grid of images with minimal surrounding text, not a list of cards with thumbnails.
- **Theme:** the UI is a neutral dark surface so images carry the color. Use the design tokens defined in `app.css` `@theme`:
  - `bg-background` — the dark base
  - `bg-surface` — elevated panels, cards, sheets
  - `text-primary` — headings and primary copy
  - `text-secondary` — paragraphs, supporting and meta copy
  - `bg-accent` / `text-accent` — the single brand accent, for primary actions and active states
  - Never hardcode hex colors or ad-hoc grays for these roles — use `text-secondary` rather than `text-primary/60` or a raw `text-gray-*` for body text.
  - **The accent is reserved for interaction.** It marks the primary action, the active tab, the selected template. Decorating static content with it removes the signal that tells a user what to press.
  - Semantic feedback states (success, warning, error) get their own tokens and stay visually distinct from `accent`, so a confirmation is never indistinguishable from ordinary UI.
- **Mobile first (non-negotiable):** every screen is designed at 320–430 px first, then widened. This is not "it doesn't break on a phone" — the phone layout is the default and the desktop layout is the enhancement. Photos are taken and shared on phones; this is the primary device for this product, not a secondary one.
  - Unprefixed Tailwind classes are the mobile layout. `sm:`/`md:`/`lg:` only ever _add_ to it. Writing a desktop layout and then patching it with `max-*` variants is backwards and fails review.
  - Single column by default; multi-column only above `md`.
  - Tap targets are at least 44 px.
  - Inputs declare the right `type` and `inputmode` so mobile keyboards are correct.
  - The upload control accepts a camera capture as readily as a file pick.
  - Test at 320 px before requesting review. Horizontal scrolling at that width is a bug.
- **Typography:** one font, set once globally via the `--font-sans` theme token in `app.css` and loaded with `next/font`. Never hardcode a different font-family or a per-component font on any element, and never load a font with a raw `<link>` — `next/font` self-hosts it and avoids the layout shift.

---

## Reusability (non-negotiable)

Repeated code and repeated functionality are defects, not style preferences. Both fail review.

- **Search before you write.** Before adding a component, hook, util, type, or constant, grep `components/`, `hooks/`, `lib/constants/`, and `types/` for something that already does it. Writing a second implementation of something that exists is the most expensive mistake in this codebase — reuse it, or extend it so both callers share it.
- **Second occurrence = extract.** The first time you write something, write it inline. The second time you need the same markup, logic, or literal, stop and extract it into a shared component/hook/constant, then update the first caller to use it. Never let a third copy exist.
- **Extend, don't clone.** Needing a variant of an existing component is never a reason to copy it into a new file and tweak it. Add a prop or a variant to the original. `TemplateCard` and `TemplateCardCompact` as separate files with duplicated markup is a bug.
- **The user gallery and the admin list share their primitives.** Both render templates. The image tile, the category chip, the empty state, and the trending badge are one component each, used by both — an admin table that re-implements a template tile is duplication, not a different feature.
- **No copy-pasted JSX.** Repeated blocks that differ only in text, icon, or link are data, not markup — move the varying parts into an array in `lib/constants/` and `.map()` over a single component. Three cards written out three times is three places to fix a bug.
- **Repeated logic becomes a hook.** Any stateful or effectful logic used by more than one component (upload handling, generation polling, debouncing, media queries, form wiring, local storage) moves to `hooks/` as a `use*` hook. Duplicated `useEffect` bodies across components fail review.
- **Repeated pure logic becomes a util.** Formatting, parsing, sorting, validating, deriving — one function, one place, imported everywhere. Never inline the same transform in two components.
- **Constants are declared once.** Any string, number, URL, key, or option list used in more than one place lives in `lib/constants/` and is imported. Category slugs, generation statuses, accepted MIME types, the max upload size, the polling interval, route paths, query keys. Duplicated magic values are how two copies drift apart.
- **Types are composed, not retyped.** Derive from the source of truth with `Pick`, `Omit`, `Partial`, and `z.infer` rather than hand-writing a second interface with the same fields. Two definitions of the same shape will disagree eventually.
- **Repeated styling becomes a component or a variant.** The same long Tailwind class string appearing in multiple places means a missing `components/ui/` primitive (or a variant on an existing one). Don't copy class lists between files.
- **Shared primitives live in `components/ui/`.** The moment a feature component is used by a second feature, it moves out of `components/<feature>/` and into `components/ui/`. It does not get copied.
- **Leave no duplicate behind.** When you extract something, delete every copy it replaced in the same change. An extraction that leaves the old copies in place has made things worse.
- **The one exception:** two things that merely look alike today but answer to different requirements are not duplication — forcing them into one abstraction couples unrelated features. Reuse identical _functionality_, not coincidental resemblance. If you skip an extraction for this reason, say why in the PR.

---

## Application

- **API calls:** only `createQuery` / `createMutation` from `react-query-kit`. Never raw `useQuery` / `useMutation` in components, and never a bare `fetch` in a component body.
- **Types and API calls never share a file.** An `api/` module holds `createQuery` / `createMutation` factories and nothing else — the request and response shapes it uses are declared in `types/` and imported. An `interface` declared beside a fetcher is a type that no second caller can find, so the next caller writes it again.
- **Domain types are grouped by domain**, one file each (`types/template.ts`, `types/generation.ts`, `types/user.ts`, `types/category.ts`), and are composed from the source of truth with `Pick`, `Omit`, `Partial`, and `z.infer` rather than hand-written twice.
- **Component prop interfaces stay with their component.** A `*Props` shape has exactly one consumer, so co-locating it is correct — it is not an exception to the rule above. The moment a second file needs it, it moves to `types/`.
- **Zod schemas live in `schemas/`**, never in `types/` and never inline in a component. A schema is runtime code that happens to produce a type; `types/` holds declarations that vanish at build time. Infer the type from the schema (`z.infer`) and import it from there rather than declaring the shape a second time.
- **State:** prefer local state or URL params. **Category filters, the selected template, and gallery pagination belong in the URL** — a user sharing a link to a trend must land on that trend. Zustand only for true global state.
- **Components:** small, focused, typed props. No business logic inside queries.
- **File size cap:** no file exceeds **150 lines**. When a component grows past that, split it into smaller focused components, each in its own file — one file = one visual/behavioral responsibility (a panel, a list item, a control).
- **Component location:** co-locate a feature's components in a `components/<feature>/` folder (e.g. `components/template-gallery/`). Truly shared primitives (e.g. `Button`) live in `components/ui/`.
- **Non-component files** are not kept beside components — they go in the shared folders: hooks → `hooks/`, constants and static data → `lib/constants/`, types → `types/`, Zod schemas → `schemas/`. Never inline them in component files. Import them with the `@/` alias, not deep relative paths.
- **Images:** always `next/image`, never a raw `<img>` — the generated outputs are the heaviest thing on every page, and sizing, lazy loading, and format negotiation are not optional. Every image declares `sizes`, and above-the-fold hero and template previews are `priority`. Blob hostnames are configured once in `next.config.ts`.
- **Generation is a tracked, visible process.** The client starts a generation, then polls its row ([backend rulebook](backend.md#platform-constraints-are-rules-not-trivia)) — it never holds a request open and never assumes success. Every generation UI handles all four states explicitly: idle, pending, succeeded, failed. A spinner with no timeout ceiling and no failure path is not a loading state.
- **Never block the user on an unexplained wait.** A pending generation shows what is happening and roughly how long it takes, because 5–20 seconds of silence reads as broken.
- **Animations:** use `framer-motion` for transitions and entrances. Keep each animation's config local to the component it animates. Image reveals are a place this product earns polish; a generated result appearing should feel like a result.
- **Error handling:** reusable `<LoadingScreen/>` / `<ErrorScreen/>`; always toast on mutation success/error. A failed generation shows the user-safe reason from the row, never a raw provider error.
- **Forms:** `react-hook-form` + Zod only, sharing the schema from `schemas/` with the handler that receives the submission. No per-field `useState`.
- **Performance:** memoize with `React.memo` / `useMemo` / `useCallback`; avoid creating new objects/functions inline in JSX. A template grid re-rendering on every keystroke of a filter input is the predictable failure here.
- **Accessibility:** every image has meaningful `alt` (a template preview describes its style, not "image"), every control is reachable and labelled, and generation state changes are announced to assistive technology rather than conveyed by a spinner alone.
- **Styling:** Tailwind CSS.
