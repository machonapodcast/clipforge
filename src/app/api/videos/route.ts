import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Downloading a VOD can take longer than Vercel's default timeout.
export const maxDuration = 60;

function detectSourceType(url: string): "youtube" | "twitch" | null {
  if (/(?:youtube\.com|youtu\.be)/i.test(url)) return "youtube";
  if (/twitch\.tv/i.test(url)) return "twitch";
  return null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ videos: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const sourceUrl = formData.get("sourceUrl");

  if (file instanceof File) {
    const { data: video, error: insertError } = await supabase
      .from("videos")
      .insert({ user_id: user.id, source_type: "upload", status: "downloading" })
      .select()
      .single();
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    const storagePath = `${user.id}/${video.id}/source.mp4`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(storagePath, buffer, { contentType: file.type || "video/mp4" });

    if (uploadError) {
      await supabase.from("videos").update({ status: "failed" }).eq("id", video.id);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: updated } = await supabase
      .from("videos")
      .update({ status: "ready", storage_path: storagePath })
      .eq("id", video.id)
      .select()
      .single();

    return NextResponse.json({ video: updated });
  }

  if (typeof sourceUrl === "string" && sourceUrl.length > 0) {
    const sourceType = detectSourceType(sourceUrl);
    if (!sourceType) {
      return NextResponse.json(
        { error: "Only YouTube or Twitch VOD URLs are supported right now" },
        { status: 400 }
      );
    }

    const { data: video, error: insertError } = await supabase
      .from("videos")
      .insert({ user_id: user.id, source_type: sourceType, source_url: sourceUrl, status: "downloading" })
      .select()
      .single();
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    try {
      const workerRes = await fetch(`${process.env.WORKER_URL}/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-worker-secret": process.env.WORKER_SHARED_SECRET!,
        },
        body: JSON.stringify({ videoId: video.id, sourceUrl, userId: user.id }),
      });

      if (!workerRes.ok) {
        const body = await workerRes.json().catch(() => ({}));
        throw new Error(body.error || `Worker responded ${workerRes.status}`);
      }

      const { storagePath } = await workerRes.json();

      const { data: updated } = await supabase
        .from("videos")
        .update({ status: "ready", storage_path: storagePath })
        .eq("id", video.id)
        .select()
        .single();

      return NextResponse.json({ video: updated });
    } catch (err) {
      await supabase.from("videos").update({ status: "failed" }).eq("id", video.id);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Download failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Provide either a file or a sourceUrl" }, { status: 400 });
}
