import Link from "next/link";

import { TemplateGrid } from "@/components/template-gallery/template-grid";
import { SiteHeader } from "@/components/ui/site-header";
import { ROUTES } from "@/lib/constants/routes";
import { listPublishedTemplates } from "@/repositories/template-repository";

export default async function HomePage() {
  const templates = await listPublishedTemplates();
  const trending = templates.filter((template) => template.isTrending);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <section className="max-w-2xl">
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            Turn your photo into the trend everyone is posting.
          </h1>
          <p className="mt-4 text-base text-secondary sm:text-lg">
            Pick a style, upload a photo, and get your version in seconds. No
            prompt writing.
          </p>
          <Link
            href={ROUTES.templates}
            className="mt-7 inline-flex min-h-12 items-center rounded-full bg-accent px-6 text-sm font-semibold text-background transition-colors hover:bg-accent-strong"
          >
            Browse styles
          </Link>
        </section>

        <section className="mt-14">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Trending now
            </h2>
            <Link
              href={ROUTES.templates}
              className="text-sm font-medium text-accent hover:underline"
            >
              See all
            </Link>
          </div>
          <TemplateGrid templates={trending} />
        </section>
      </main>
    </>
  );
}
