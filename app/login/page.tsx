import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signIn, signUp } from "@/app/auth/actions";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in" };

type PageProps = { searchParams: Promise<{ error?: string; message?: string }> };

export default async function LoginPage({ searchParams }: PageProps) {
  if (!isSupabaseConfigured()) redirect("/setup");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect("/dashboard");
  const params = await searchParams;

  return (
    <main className="mx-auto w-full max-w-[32rem] px-4 py-12 sm:py-20">
      <p className="eyebrow mb-3">Your workspace</p>
      <h1 className="page-title">Welcome back.</h1>
      <p className="page-description mt-3">
        Sign in to view your private tax records and 2026 estimate.
      </p>
      <div className="card-surface mt-8 p-6 sm:p-8">
        {params.error ? (
          <p
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {params.error}
          </p>
        ) : null}
        {params.message ? (
          <p
            role="status"
            className="mb-5 rounded-lg border border-[#c9e3cd] bg-[#edf7ef] px-4 py-3 text-sm text-[#285c4d]"
          >
            {params.message}
          </p>
        ) : null}
        <form className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#314b40]">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="field-input mt-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#314b40]">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={8}
              required
              className="field-input mt-2"
            />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button formAction={signIn} className="button-primary">
              Sign in
            </button>
            <button formAction={signUp} className="button-secondary">
              Create account
            </button>
          </div>
        </form>
      </div>
      <p className="mt-5 text-center text-xs leading-5 text-[#60716b]">
        TaxToolsIE never asks for your Revenue login or files a return for you.
      </p>
    </main>
  );
}
