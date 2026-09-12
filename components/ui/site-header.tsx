import Link from "next/link";

import { ROUTES } from "@/lib/constants/routes";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 py-3">
        <Link href={ROUTES.home} className="text-lg font-bold tracking-tight">
          Go<span className="text-accent">Trend</span>
        </Link>
        <Link
          href={ROUTES.templates}
          className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-medium text-secondary transition-colors hover:border-accent/60 hover:text-primary"
        >
          Browse styles
        </Link>
      </div>
    </header>
  );
}
