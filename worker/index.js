const express = require("express");
const { execFile } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function requireAuth(req, res, next) {
  if (req.headers["x-worker-secret"] !== process.env.WORKER_SHARED_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

app.get("/health", (req, res) => res.json({ ok: true }));

// Downloads a YouTube or Twitch VOD URL via yt-dlp and uploads the result
// to Supabase Storage under <videoId>/source.mp4.
app.post("/download", requireAuth, async (req, res) => {
  const { videoId, sourceUrl, userId } = req.body || {};
  if (!videoId || !sourceUrl || !userId) {
    return res.status(400).json({ error: "videoId, sourceUrl and userId are required" });
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "clip-"));
  const outputPath = path.join(tmpDir, "source.mp4");

  try {
    await new Promise((resolve, reject) => {
      execFile(
        "yt-dlp",
        ["-f", "mp4", "-o", outputPath, sourceUrl],
        { maxBuffer: 1024 * 1024 * 50 },
        (error, stdout, stderr) => (error ? reject(new Error(stderr || error.message)) : resolve())
      );
    });

    const fileBuffer = fs.readFileSync(outputPath);
    const storagePath = `${userId}/${videoId}/source.mp4`;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(storagePath, fileBuffer, { contentType: "video/mp4", upsert: true });

    if (uploadError) throw uploadError;

    res.json({ storagePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`worker listening on ${port}`));
