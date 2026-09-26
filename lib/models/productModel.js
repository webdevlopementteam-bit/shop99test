// backend/models/productModel.js

import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import ProductAttribute from "./productAttributeModel.js";
import Offer from "./offerModel.js";

const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    brand_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    name: DataTypes.STRING,
    slug: {
      type: DataTypes.STRING,
      unique: true
    },
    meta_title: DataTypes.STRING(255),
    meta_description: DataTypes.TEXT,
    sku: DataTypes.STRING,
    hsn: DataTypes.STRING,
    fsn: DataTypes.STRING,

    short_description: DataTypes.TEXT,
    specifications: {
      type: DataTypes.JSON,
      allowNull: true
    },
    is_cod: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // is_popular: {
    //   type: DataTypes.TINYINT,
    //   defaultValue: 0
    // },
    in_stock: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },

    price: DataTypes.DECIMAL(10, 2),
    old_price: DataTypes.DECIMAL(10, 2),

    image: DataTypes.STRING,

    shipping_mode: {
      type: DataTypes.STRING(32),
      defaultValue: "free"
    },
    shipping_flat_fee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    }
  },
  {
    tableName: "products",
    timestamps: false
  }
);

// 🔥 ADD THIS
Product.hasMany(ProductAttribute, {
  foreignKey: "product_id"
});

Product.belongsToMany(Offer, {
  through: "OfferProducts",
  foreignKey: "product_id"
});

export default Product;

