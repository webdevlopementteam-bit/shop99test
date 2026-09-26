import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const ProductImage = sequelize.define("ProductImage", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: "product_images",
  timestamps: false
});

export default ProductImage;