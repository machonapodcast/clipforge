# ClipForge

Turns streamer VODs (YouTube/Twitch) or uploaded video into ready-to-post,
captioned, vertical short clips automatically.

Built in phases — see the account checklist and phase list in the project
build plan. Each phase adds a working, demoable piece of the product.

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in real keys as each phase needs them
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js 16 (App Router, TypeScript) — website + API routes, deployed on Vercel
- Supabase — Postgres database, Auth, file storage
- A small worker service (Node/Express, deployed on Railway) — video download (yt-dlp) and Remotion rendering
- Inngest — orchestrates the multi-step clip-generation pipeline
- AssemblyAI — transcription
- Anthropic Claude API — clip moment detection + copywriting
- Stripe — subscription billing
- Resend — transactional/lifecycle email

`src/proxy.ts` is Next.js 16's renamed `middleware.ts` — it refreshes the
Supabase auth session and gates `/dashboard` routes.
