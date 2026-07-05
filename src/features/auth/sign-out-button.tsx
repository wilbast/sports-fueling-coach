"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  if (!isSupabaseConfigured()) return null;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-coach-100 hover:text-coach-700"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Abmelden
    </button>
  );
}
