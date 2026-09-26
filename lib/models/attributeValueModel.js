// models/attributeValueModel.js

import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import Attribute from "./attributeModel.js";

const AttributeValue = sequelize.define("AttributeValue", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false
  },
  attribute_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: "attribute_values",
  timestamps: false
});

// relations
Attribute.hasMany(AttributeValue, { foreignKey: "attribute_id" });
AttributeValue.belongsTo(Attribute, { foreignKey: "attribute_id" });

export default AttributeValue;