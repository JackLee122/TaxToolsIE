"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";

const navItems = [
  { href: "/dashboard", label: "Overview", ready: true },
  { href: "/employment", label: "Employment", ready: true },
  { href: "/investments", label: "Investments", ready: true },
  { href: "/credits", label: "Tax credits", ready: true },
  { href: "/imports", label: "Imports", ready: true },
  { href: "/filing", label: "Filing", ready: true },
  { href: "/settings", label: "Settings", ready: false },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const protectedRoute = navItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <header className="border-b border-[#dce3dc] bg-[#fdfefb]">
      <div className="mx-auto flex h-[4.5rem] w-full max-w-[75rem] items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-3"
          aria-label="TaxToolsIE home"
        >
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#285c4d] text-sm font-bold tracking-tighter text-white"
          >
            T<span className="text-[#a9dac0]">.</span>
          </span>
          <span className="min-w-0">
            <span className="block text-[0.98rem] font-bold tracking-tight text-[#1d302a]">
              TaxToolsIE
            </span>
            <span className="block text-[0.65rem] font-medium tracking-wide text-[#60716b]">
              PERSONAL TAX WORKSPACE
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-5">
          {protectedRoute ? (
            <span className="hidden rounded-full bg-[#edf3ed] px-3 py-1.5 text-xs font-semibold text-[#285c4d] sm:inline">
              2026 tax year
            </span>
          ) : null}
          {protectedRoute ? (
            <form action={signOut}>
              <button className="text-sm font-medium text-[#465b52] hover:text-[#173d33]">
                Sign out
              </button>
            </form>
          ) : pathname !== "/login" && pathname !== "/setup" ? (
            <Link
              href="/login"
              className="text-sm font-semibold text-[#285c4d] hover:text-[#173d33]"
            >
              Sign in
            </Link>
          ) : null}
        </div>
      </div>
      {protectedRoute ? (
        <nav aria-label="Main" className="border-t border-[#edf0eb]">
          <div className="mx-auto flex w-full max-w-[75rem] gap-1 overflow-x-auto px-4 sm:px-6">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  prefetch={item.ready}
                  className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-[0.82rem] font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "border-[#285c4d] text-[#1e4d3d]"
                      : "border-transparent text-[#60716b] hover:text-[#1e4d3d]"
                  }`}
                >
                  {item.label}
                  {!item.ready ? (
                    <span className="text-[0.6rem] font-semibold uppercase tracking-wide text-[#89958e]">
                      Soon
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
