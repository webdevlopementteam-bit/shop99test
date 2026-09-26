import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const ProductVariant = sequelize.define("ProductVariant", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  /** DB column `attributes` — renamed in model so Sequelize does not treat it as query options */
  variantAttrs: {
    type: DataTypes.JSON,
    field: "attributes",
    allowNull: false,
  },

  short_description: DataTypes.TEXT,

  /** Optional display title for this variant (e.g. "128 GB — Midnight") */
  heading: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },

  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },

  old_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },

  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  specifications: {
    type: DataTypes.JSON,
    allowNull: true,
  },

  image: DataTypes.STRING,
}, {
  tableName: "product_variants",
  timestamps: false,
});

export default ProductVariant;