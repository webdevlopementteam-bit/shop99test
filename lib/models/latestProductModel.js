import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import Product from "./productModel.js";

const LatestProduct = sequelize.define(
  "LatestProduct",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "latest_products",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

LatestProduct.belongsTo(Product, { foreignKey: "product_id" });

export default LatestProduct;
