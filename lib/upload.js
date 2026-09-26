// lib/upload.js
//
// Replaces backend/middleware/upload.js (multer diskStorage) for use inside
// Route Handlers, which don't run Express middleware. Route Handlers get
// uploaded files via the Web FormData API (`await request.formData()`)
// instead — this just writes a File to public/uploads/ with the exact same
// naming convention multer used (`Date.now() + "-" + originalname`), so
// every already-stored filename/URL in the database keeps resolving.

import fs from "node:fs/promises";
import path from "node:path";

// Paths under UPLOAD_DIR are runtime-only, so the fs calls below carry
// turbopackIgnore — otherwise Turbopack traces (and bundles) every file in
// public/uploads/ into the route output.
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/** Strips any directory parts (incl. Windows-style "\\") so a name like
 * "../../x" can never resolve outside UPLOAD_DIR. Returns null if nothing
 * usable is left. Plain stored names ("123-photo.jpg") pass through unchanged. */
function safeName(name) {
  const base = path.basename(String(name).replace(/\\/g, "/"));
  if (!base || base === "." || base === ".." || base.includes("\0")) return null;
  return base;
}

/** Saves a single Web File (from formData.get(field)) to public/uploads/.
 * Returns the generated filename (matching multer's `req.file.filename`),
 * or null if `file` isn't a real uploaded file (empty/absent field). */
export async function saveUploadedFile(file) {
  if (!file || typeof file === "string" || !file.name) return null;
  if (file.size === 0 && file.name === "") return null;

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const original = safeName(file.name);
  if (!original) return null;

  const filename = `${Date.now()}-${original}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, filename), buffer);

  return filename;
}

/** Saves every File under `field` in a FormData (supports multiple files per
 * field, e.g. upload.fields([...]) with maxCount > 1). Returns filenames[]. */
export async function saveUploadedFiles(formData, field) {
  const files = formData.getAll(field).filter((f) => f && typeof f !== "string" && f.name);
  const filenames = [];
  for (const file of files) {
    const name = await saveUploadedFile(file);
    if (name) filenames.push(name);
  }
  return filenames;
}

/** Deletes a previously-uploaded file by filename (mirrors backend's fs.unlinkSync cleanup). */
export async function deleteUploadedFile(filename) {
  const name = filename && safeName(filename);
  if (!name) return;
  try {
    await fs.unlink(path.join(/* turbopackIgnore: true */ UPLOAD_DIR, name));
  } catch {
    // already gone / never existed — same no-op behavior as fs.existsSync guard
  }
}
