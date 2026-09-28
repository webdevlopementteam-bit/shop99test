// // backend/models/categoryModel.js

import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Category = sequelize.define(
  "Category",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    is_parent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    is_top_category: {
      type: DataTypes.TINYINT,
      defaultValue: 0
    },

    slug: {
      type: DataTypes.STRING,
      unique: true
    },

    tax_rate: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },

    hsn: {
      type: DataTypes.STRING(32),
      allowNull: true
    },

    is_publish: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },

    image: DataTypes.STRING,

    banner: DataTypes.STRING

    // SEO columns (meta_title/meta_description/meta_keywords) are deliberately
    // NOT model attributes: they only exist once
    // scripts/add-category-seo-columns.mjs has run, and as attributes every
    // category query would fail without them. lib/categorySeo.js reads and
    // writes them separately.
  },
  {
    tableName: "categories",
    timestamps: false
  }
);



export default Category;