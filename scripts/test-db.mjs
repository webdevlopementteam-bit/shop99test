import { sequelize } from "../lib/db.js";
import Category from "../lib/models/categoryModel.js";

await sequelize.authenticate();
console.log("DB connected OK");

const rows = await Category.findAll({ limit: 3 });
console.log("Categories found:", rows.length);
console.log(rows.map((r) => ({ id: r.id, name: r.name })));

await sequelize.close();
