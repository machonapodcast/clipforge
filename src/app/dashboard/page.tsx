import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import VideoSubmitForm from "@/components/VideoSubmitForm";

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

  const { data: videos } = await supabase
    .from("videos")
    .select("id, source_type, source_url, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-black/10 px-8 py-4 dark:border-white/10">
        <span className="font-semibold">ClipForge</span>
        <SignOutButton />
      </header>

      <main className="flex flex-1 flex-col items-center gap-6 px-8 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Welcome, {user!.email}</h1>
          {profile && (
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              Plan: {profile.plan} &middot; Clips used this cycle:{" "}
              {profile.clips_used_this_cycle} &middot; Referral code:{" "}
              {profile.referral_code}
            </p>
          )}
        </div>

        <VideoSubmitForm />

        <div className="w-full max-w-md">
          <h2 className="mb-2 text-sm font-semibold text-zinc-500">Your videos</h2>
          {!videos || videos.length === 0 ? (
            <p className="text-sm text-zinc-500">No videos submitted yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {videos.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                >
                  <span className="truncate">{v.source_url || "Uploaded file"}</span>
                  <span className="ml-2 shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                    {v.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
