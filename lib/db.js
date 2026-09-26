// lib/db.js
//
// Ported from backend/config/db.js — same Sequelize(host/user/pass/db) call,
// same dialect/logging options. The globalThis cache guards against Next.js
// dev-mode module re-evaluation (Fast Refresh/Turbopack can re-run this file
// on every edit) opening a fresh connection pool each time; in production
// this file only ever runs once per process anyway.

import { Sequelize } from "sequelize";

const globalForSequelize = globalThis;

export const sequelize =
  globalForSequelize.__shop99Sequelize ??
  new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      dialect: "mysql",
      port: process.env.DB_PORT,
      logging: false,
    },
  );

if (process.env.NODE_ENV !== "production") {
  globalForSequelize.__shop99Sequelize = sequelize;
}

export default sequelize;
