// Category SEO fields (meta_title, meta_description, meta_keywords), read and
// written apart from the Category model so that category queries keep working
// before scripts/add-category-seo-columns.mjs has added the columns. Until
// then reads return null and writes are skipped with a warning.

import { QueryTypes } from "sequelize";
import sequelize from "@/lib/db.js";
import { slugify } from "@/lib/utils/slugify.js";

const FIELDS = ["meta_title", "meta_description", "meta_keywords"];
const text = (v) => (v == null ? "" : String(v).trim());

// Cached once known to exist; retried until then (the migration may run while
// the server is up).
let columnsExist = false;
let warned = false;
async function hasColumns() {
  if (columnsExist) return true;
  try {
    const cols = await sequelize.getQueryInterface().describeTable("categories");
    columnsExist = FIELDS.every((f) => cols[f]);
  } catch {
    columnsExist = false;
  }
  if (!columnsExist && !warned) {
    warned = true;
    console.warn("[categorySeo] SEO columns missing — run scripts/add-category-seo-columns.mjs");
  }
  return columnsExist;
}

/** SEO fields from a category create/update form body. Fields the form didn't
 * send are left out (so older clients don't wipe them); blank clears. */
export function pickCategorySeo(body) {
  const out = {};
  for (const k of FIELDS) {
    if (body[k] !== undefined) out[k] = text(body[k]) || null;
  }
  return out;
}

/** Saves SEO fields for a category. Returns false if they couldn't be saved. */
export async function saveCategorySeo(id, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return true;
  if (!(await hasColumns())) return false;
  await sequelize.query(`UPDATE categories SET ${keys.map((k) => `\`${k}\` = ?`).join(", ")} WHERE id = ?`, {
    replacements: [...keys.map((k) => fields[k]), id],
  });
  return true;
}

/** SEO fields of one category by id — all "" if not set / columns missing. */
export async function getCategorySeoById(id) {
  const empty = Object.fromEntries(FIELDS.map((f) => [f, ""]));
  if (!(await hasColumns())) return empty;
  const [row] = await sequelize.query(`SELECT ${FIELDS.join(", ")} FROM categories WHERE id = ? LIMIT 1`, {
    replacements: [id],
    type: QueryTypes.SELECT,
  });
  return row ? { ...empty, ...row } : empty;
}

/**
 * SEO of the category behind /shop?category=<name> (shop links pass the name;
 * slugs work too), shaped like an SEO-table row for applySeoEntry — or null.
 */
export async function findCategorySeo(nameOrSlug) {
  const value = text(nameOrSlug);
  if (!value) return null;
  try {
    if (!(await hasColumns())) return null;
    let [row] = await sequelize.query(
      `SELECT parent_id, ${FIELDS.join(", ")} FROM categories WHERE name = ? OR slug = ? LIMIT 1`,
      { replacements: [value, slugify(value)], type: QueryTypes.SELECT },
    );
    // No SEO of its own → nearest ancestor's (Car Stereo → Stereo), so a
    // subcategory page reached by any URL, incl. its canonical
    // ?subCategory=<name>, still gets its section's SEO.
    for (let depth = 0; row && depth < 5; depth++) {
      if (FIELDS.some((k) => text(row[k]))) return row;
      if (!row.parent_id) return null;
      [row] = await sequelize.query(
        `SELECT parent_id, ${FIELDS.join(", ")} FROM categories WHERE id = ? LIMIT 1`,
        { replacements: [row.parent_id], type: QueryTypes.SELECT },
      );
    }
    return null;
  } catch (err) {
    console.warn("[categorySeo] lookup failed:", err.message);
    return null;
  }
}
