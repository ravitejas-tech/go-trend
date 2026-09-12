import Image from "next/image";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/ui/site-header";
import { GENERATION_ESTIMATED_SECONDS } from "@/lib/constants/generation";
import { findPublishedTemplateBySlug } from "@/repositories/template-repository";

type TemplatePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function TemplatePage({ params }: TemplatePageProps) {
  const { slug } = await params;
  const template = await findPublishedTemplateBySlug(slug);

  if (!template) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-surface-raised">
            <Image
              src={template.previewUrl}
              alt={`${template.title} — ${template.description}`}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
              className="object-cover"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{template.category.name}</Badge>
              {template.isTrending ? <Badge tone="accent">Trending</Badge> : null}
            </div>

            <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight sm:text-4xl">
              {template.title}
            </h1>
            <p className="mt-3 text-base text-secondary">
              {template.description}
            </p>

            <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
              <p className="text-sm font-semibold text-primary">
                Upload a photo to get started
              </p>
              <p className="mt-1 text-sm text-secondary">
                Generation takes about {GENERATION_ESTIMATED_SECONDS} seconds.
              </p>
              <button
                type="button"
                disabled
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                Upload photo
              </button>
              <p className="mt-3 text-xs text-secondary">
                {/* TODO: enable once the upload and generation routes land */}
                Coming next: upload, generate, and download.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
