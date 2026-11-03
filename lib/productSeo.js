// Product SEO extras (products.meta_keywords, products.image_alts), read and
// written apart from the Product model so that every product query keeps
// working before scripts/add-product-seo-columns.mjs has added the columns.
// Until then reads return "" and writes are skipped with a warning. Same
// approach as lib/categorySeo.js.

import { QueryTypes } from "sequelize";
import sequelize from "@/lib/db.js";

const FIELDS = ["meta_keywords", "image_alts"];
const text = (v) => (v == null ? "" : String(v).trim());

// Columns that exist, cached once all are there; re-checked until then (the
// migration may run while the server is up).
let present = [];
let warned = false;
async function existingColumns() {
  if (present.length === FIELDS.length) return present;
  try {
    const cols = await sequelize.getQueryInterface().describeTable("products");
    present = FIELDS.filter((f) => cols[f]);
  } catch {
    present = [];
  }
  if (present.length < FIELDS.length && !warned) {
    warned = true;
    const missing = FIELDS.filter((f) => !present.includes(f)).join(", ");
    console.warn(`[productSeo] products columns missing (${missing}) — run scripts/add-product-seo-columns.mjs`);
  }
  return present;
}

/** { meta_keywords, image_alts } of one product — "" when not set / column missing. */
export async function getProductSeoExtras(id) {
  const out = Object.fromEntries(FIELDS.map((f) => [f, ""]));
  const cols = await existingColumns();
  if (!cols.length) return out;
  const [row] = await sequelize.query(`SELECT ${cols.join(", ")} FROM products WHERE id = ? LIMIT 1`, {
    replacements: [id],
    type: QueryTypes.SELECT,
  });
  for (const f of cols) out[f] = text(row?.[f]);
  return out;
}

/**
 * Saves the extras from a product create/update form body. A field the form
 * didn't send is left alone (older clients); blank clears it. Fields whose
 * column doesn't exist yet are skipped.
 */
export async function saveProductSeoExtras(id, body) {
  const cols = (await existingColumns()).filter((f) => body[f] !== undefined);
  if (!cols.length) return;
  await sequelize.query(`UPDATE products SET ${cols.map((f) => `\`${f}\` = ?`).join(", ")} WHERE id = ?`, {
    replacements: [...cols.map((f) => text(body[f]) || null), id],
  });
}
