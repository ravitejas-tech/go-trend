import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/constants/routes";
import type { TemplateWithCategory } from "@/types/template";

type TemplateCardProps = {
  template: TemplateWithCategory;
  priority?: boolean;
};

export function TemplateCard({ template, priority }: TemplateCardProps) {
  return (
    <Link
      href={ROUTES.template(template.slug)}
      className="group block overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-accent/60 focus-visible:border-accent focus-visible:outline-none"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-raised">
        <Image
          src={template.previewUrl}
          alt={`${template.title} — ${template.description}`}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          priority={priority}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {template.isTrending ? (
          <div className="absolute left-3 top-3">
            <Badge tone="accent">Trending</Badge>
          </div>
        ) : null}
      </div>

      <div className="space-y-1 p-4">
        <p className="text-xs uppercase tracking-wide text-secondary">
          {template.category.name}
        </p>
        <h3 className="text-base font-semibold leading-tight text-primary">
          {template.title}
        </h3>
        <p className="line-clamp-2 text-sm text-secondary">
          {template.description}
        </p>
      </div>
    </Link>
  );
}
