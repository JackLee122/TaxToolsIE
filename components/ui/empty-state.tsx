import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  hint?: string;
};

export function EmptyState({ icon, title, description, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 px-6 py-12 text-center">
      {icon ? <div className="text-zinc-400">{icon}</div> : null}
      <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
      <p className="max-w-xl text-sm leading-relaxed text-zinc-600">{description}</p>
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}