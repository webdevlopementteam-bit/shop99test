// models/categoryAttributeMapModel.js

import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const CategoryAttributeMap = sequelize.define("CategoryAttributeMap", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  attribute_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
   is_extra: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: "category_attribute_maps",
  timestamps: false
});

export default CategoryAttributeMap;