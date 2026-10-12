"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentials = z.object({
  email: z.email().trim(),
  password: z.string().min(8),
});

function authError(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

function readCredentials(formData: FormData) {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) authError("Enter a valid email and a password of at least 8 characters");
  return parsed.data;
}

export async function signIn(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(readCredentials(formData));
  if (error) authError("Sign in failed. Check your email and password.");
  redirect("/dashboard");
}

export async function signUp(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const vercelUrl = process.env.VERCEL_URL;
  const origin = siteUrl ?? (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
  const { error } = await supabase.auth.signUp({
    ...readCredentials(formData),
    options: { emailRedirectTo: new URL("/auth/callback", origin).toString() },
  });
  if (error) authError("Could not create account. Please try again.");
  redirect("/login?message=Check your email to confirm your account");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
