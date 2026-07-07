"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function VideoSubmitForm() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function submit(formData: FormData) {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/videos", { method: "POST", body: formData });
    const body = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(body.error || "Something went wrong");
      return;
    }

    setSourceUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("sourceUrl", sourceUrl);
    await submit(formData);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    await submit(formData);
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-black/10 p-6 dark:border-white/10">
      <form onSubmit={handleUrlSubmit} className="flex gap-2">
        <input
          type="url"
          required
          placeholder="YouTube or Twitch VOD URL"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="flex-1 rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>

      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
        or
        <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        disabled={loading}
        className="text-sm"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
