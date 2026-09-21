"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/employment", label: "Employment" },
  { href: "/investments", label: "Investments" },
  { href: "/credits", label: "Tax credits" },
  { href: "/imports", label: "Imports" },
  { href: "/filing", label: "Filing" },
  { href: "/settings", label: "Settings" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/dashboard" className="flex min-w-0 items-baseline gap-2">
          <span className="text-base font-semibold tracking-tight">TaxToolie</span>
          <span className="hidden truncate text-xs text-zinc-500 lg:inline">
            Irish Personal Tax Dashboard
          </span>
        </Link>
        <nav
          aria-label="Main"
          className="flex flex-1 items-center justify-end gap-1 overflow-x-auto whitespace-nowrap text-sm"
        >
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md px-2.5 py-1.5 transition-colors ${
                  active
                    ? "bg-zinc-100 font-medium text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}