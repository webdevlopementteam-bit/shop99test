import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const ProductAttribute = sequelize.define("ProductAttribute", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  attribute_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  attribute_value_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: "product_attributes",
  timestamps: false
});


// 🔥 ADD THESE RELATIONS
import Attribute from "./attributeModel.js";
import AttributeValue from "./attributeValueModel.js";


ProductAttribute.belongsTo(Attribute, {
  foreignKey: "attribute_id"
});

ProductAttribute.belongsTo(AttributeValue, {
  foreignKey: "attribute_value_id"
});

export default ProductAttribute;