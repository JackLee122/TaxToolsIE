import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  hint?: string;
};

export function EmptyState({ icon, title, description, hint }: EmptyStateProps) {
  return (
    <div className="card-surface relative overflow-hidden px-6 py-9 sm:px-10 sm:py-12">
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-24 size-64 rounded-full border-[36px] border-[#edf3ed]"
      />
      <div className="relative max-w-xl">
        <div
          className="mb-6 flex size-11 items-center justify-center rounded-xl bg-[#edf3ed] text-xl font-semibold text-[#285c4d]"
          aria-hidden="true"
        >
          {icon ?? "↗"}
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-[#1d302a]">{title}</h2>
        <p className="mt-2 max-w-[55ch] text-sm leading-7 text-[#60716b]">{description}</p>
        {hint ? (
          <p className="mt-5 border-t border-[#e4ebe3] pt-4 text-xs leading-5 text-[#6e7d75]">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
