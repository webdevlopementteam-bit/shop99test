import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import Product from "./productModel.js";

const MostSellingProduct = sequelize.define(
  "MostSellingProduct",
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
    tableName: "most_selling_products",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

MostSellingProduct.belongsTo(Product, { foreignKey: "product_id" });

export default MostSellingProduct;
