import { CategoryFilter } from "@/components/template-gallery/category-filter";
import { TemplateGrid } from "@/components/template-gallery/template-grid";
import { SiteHeader } from "@/components/ui/site-header";
import { listCategories } from "@/repositories/category-repository";
import { listPublishedTemplates } from "@/repositories/template-repository";

type TemplatesPageProps = {
  searchParams: Promise<{ category?: string }>;
};

export default async function TemplatesPage({
  searchParams,
}: TemplatesPageProps) {
  const { category } = await searchParams;
  const [categories, templates] = await Promise.all([
    listCategories(),
    listPublishedTemplates({ categorySlug: category }),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
          Browse styles
        </h1>
        <p className="mt-2 text-sm text-secondary sm:text-base">
          {templates.length} style{templates.length === 1 ? "" : "s"} ready to
          use.
        </p>

        <div className="mt-6">
          <CategoryFilter categories={categories} activeSlug={category} />
        </div>

        <div className="mt-8">
          <TemplateGrid templates={templates} />
        </div>
      </main>
    </>
  );
}
