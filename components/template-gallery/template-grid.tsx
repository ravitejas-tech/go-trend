import { EmptyState } from "@/components/ui/empty-state";
import type { TemplateWithCategory } from "@/types/template";

import { TemplateCard } from "./template-card";

type TemplateGridProps = {
  templates: TemplateWithCategory[];
};

export function TemplateGrid({ templates }: TemplateGridProps) {
  if (templates.length === 0) {
    return (
      <EmptyState
        title="No templates here yet"
        description="Nothing is published in this category. Try another one."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {templates.map((template, index) => (
        <TemplateCard
          key={template.id}
          template={template}
          priority={index < 4}
        />
      ))}
    </div>
  );
}
