type BadgeProps = {
  children: React.ReactNode;
  tone?: "accent" | "neutral";
};

const TONE_CLASSES = {
  accent: "bg-accent/15 text-accent",
  neutral: "bg-surface-raised text-secondary",
} as const;

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
