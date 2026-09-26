import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const ProductShippingRate = sequelize.define(
  "ProductShippingRate",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "products",
        key: "id"
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    },
    state_name: {
      type: DataTypes.STRING(128),
      allowNull: false
    },
    fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    tableName: "product_shipping_rates",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["product_id", "state_name"]
      }
    ]
  }
);

export default ProductShippingRate;
