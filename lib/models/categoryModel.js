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
  },
  {
    tableName: "categories",
    timestamps: false
  }
);



export default Category;