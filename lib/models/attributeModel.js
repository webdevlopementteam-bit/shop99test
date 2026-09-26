import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Attribute = sequelize.define("Attribute", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: "attributes",
  timestamps: false
});

export default Attribute;