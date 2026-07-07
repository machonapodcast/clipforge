import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, clips_used_this_cycle, referral_code")
    .eq("id", user!.id)
    .single();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-black/10 px-8 py-4 dark:border-white/10">
        <span className="font-semibold">ClipForge</span>
        <SignOutButton />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
        <h1 className="text-2xl font-semibold">Welcome, {user!.email}</h1>
        {profile && (
          <p className="text-zinc-600 dark:text-zinc-400">
            Plan: {profile.plan} &middot; Clips used this cycle:{" "}
            {profile.clips_used_this_cycle} &middot; Referral code:{" "}
            {profile.referral_code}
          </p>
        )}
        <p className="mt-4 text-zinc-500">
          Video submission is coming in Phase 2.
        </p>
      </main>
    </div>
  );
}
