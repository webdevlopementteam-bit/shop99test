// Serves files from public/uploads/ that were written after the server
// started. `next start` only serves public/ files that existed at startup, so
// anything saved by lib/upload.js since then (new blog/product images, etc.)
// 404s until a restart. Files that existed at startup are still served
// directly from public/ and never reach this handler.

import fs from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export async function GET(request, { params }) {
  const { path: segments } = await params;

  // Resolve and make sure the result is still inside UPLOAD_DIR.
  const filePath = path.resolve(/* turbopackIgnore: true */ UPLOAD_DIR, ...segments);
  if (!filePath.startsWith(UPLOAD_DIR + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const data = await fs.readFile(filePath);
    const type = CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    return new Response(data, {
      headers: {
        "Content-Type": type,
        // Uploaded names are timestamp-prefixed, so a given URL never changes.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        // Uploaded SVGs can carry scripts — never let one run on our origin.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
