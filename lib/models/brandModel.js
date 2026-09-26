import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Brand = sequelize.define(
  "Brand",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: DataTypes.STRING,
    image: DataTypes.STRING
  },
  {
    tableName: "brands",
    timestamps: false
  }
);

export default Brand;
