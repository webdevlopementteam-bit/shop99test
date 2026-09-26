import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const SEO = sequelize.define("SEO", {
  page_name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  meta_title: DataTypes.STRING,
  meta_description: DataTypes.TEXT,
  meta_keywords: DataTypes.TEXT,
  canonical_url: DataTypes.STRING,
  og_title: DataTypes.STRING,
  og_description: DataTypes.TEXT,
  og_image: DataTypes.STRING,
  is_active: {
  type: DataTypes.ENUM("active", "inactive"),
  defaultValue: "active"
}
}, {
  tableName: "seo",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at"
});

export default SEO;