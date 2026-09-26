import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Blogs = sequelize.define(
  "Blogs",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    content: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    meta_title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    meta_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    meta_keywords: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    tableName: "blogs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);

export default Blogs;
