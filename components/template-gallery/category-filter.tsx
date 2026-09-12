import Link from "next/link";

import { ROUTES } from "@/lib/constants/routes";
import type { Category } from "@/types/template";

type CategoryFilterProps = {
  categories: Category[];
  activeSlug?: string;
};

function chipClasses(isActive: boolean) {
  const base =
    "inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors";

  return isActive
    ? `${base} border-accent bg-accent text-background`
    : `${base} border-border bg-surface text-secondary hover:border-accent/60 hover:text-primary`;
}

export function CategoryFilter({
  categories,
  activeSlug,
}: CategoryFilterProps) {
  return (
    <nav
      aria-label="Template categories"
      className="-mx-4 overflow-x-auto px-4 pb-1"
    >
      <ul className="flex gap-2">
        <li>
          <Link href={ROUTES.templates} className={chipClasses(!activeSlug)}>
            All
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`${ROUTES.templates}?category=${category.slug}`}
              className={chipClasses(activeSlug === category.slug)}
              aria-current={activeSlug === category.slug ? "page" : undefined}
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
