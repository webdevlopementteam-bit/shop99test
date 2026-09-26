import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import Product from "./productModel.js";

const PopularProduct = sequelize.define(
  "PopularProduct",
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
    tableName: "popular_products",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

PopularProduct.belongsTo(Product, { foreignKey: "product_id" });

export default PopularProduct;