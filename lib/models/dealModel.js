import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import Product from "./productModel.js";

const Deal = sequelize.define(
  "Deal",
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
    discount_type: {
      type: DataTypes.ENUM("flat", "percent"),
      allowNull: false,
      defaultValue: "percent",
    },
    discount_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "deals",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

Deal.belongsTo(Product, { foreignKey: "product_id" });

export default Deal;
