/**
 * Adds the product SEO columns used by Admin → Products: meta_keywords and
 * image_alts. Safe to run more than once — existing columns are skipped.
 * Until it has run, the site works as before; those fields just aren't saved
 * (lib/productSeo.js).
 *
 * USAGE (on each server, once):
 *   node --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/add-product-seo-columns.mjs
 */

import { DataTypes } from "sequelize";
import { sequelize } from "../lib/db.js";

const COLUMNS = {
  meta_keywords: { type: DataTypes.TEXT, allowNull: true },
  image_alts: { type: DataTypes.TEXT, allowNull: true },
};

const qi = sequelize.getQueryInterface();
const existing = await qi.describeTable("products");

for (const [name, spec] of Object.entries(COLUMNS)) {
  if (existing[name]) {
    console.log(`= products.${name} already exists`);
    continue;
  }
  await qi.addColumn("products", name, spec);
  console.log(`+ added products.${name}`);
}

await sequelize.close();
