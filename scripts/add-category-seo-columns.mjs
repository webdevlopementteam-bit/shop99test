/**
 * Adds the category SEO columns (meta_title, meta_description, meta_keywords)
 * to the `categories` table. Safe to run more than once — existing columns are
 * skipped. Run it BEFORE deploying the code that reads these columns, or every
 * category query fails with "Unknown column".
 *
 * USAGE:
 *   node --env-file=.env.local scripts/add-category-seo-columns.mjs
 */

import { DataTypes } from "sequelize";
import { sequelize } from "../lib/db.js";

const COLUMNS = {
  meta_title: { type: DataTypes.STRING(255), allowNull: true },
  meta_description: { type: DataTypes.TEXT, allowNull: true },
  meta_keywords: { type: DataTypes.TEXT, allowNull: true },
};

const qi = sequelize.getQueryInterface();
const existing = await qi.describeTable("categories");

for (const [name, spec] of Object.entries(COLUMNS)) {
  if (existing[name]) {
    console.log(`= categories.${name} already exists`);
    continue;
  }
  await qi.addColumn("categories", name, spec);
  console.log(`+ added categories.${name}`);
}

await sequelize.close();
