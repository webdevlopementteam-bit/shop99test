import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const ProductAttributeMap = sequelize.define(
  "ProductAttributeMap",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    attribute_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "product_attribute_maps",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["product_id", "attribute_id"],
      },
    ],
  }
);

export default ProductAttributeMap;
