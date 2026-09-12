type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-6 py-14 text-center">
      <p className="text-base font-semibold text-primary">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-secondary">
        {description}
      </p>
    </div>
  );
}
