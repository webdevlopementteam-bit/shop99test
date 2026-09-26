import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Footer = sequelize.define(
  "Footer",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    logo: DataTypes.STRING,
    description: DataTypes.TEXT,
    columns: DataTypes.TEXT,   // ✅ store as JSON string
    contact: DataTypes.TEXT,
    socials: DataTypes.TEXT,
    copyright: DataTypes.STRING,
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "footer",
    timestamps: false,
  }
);

export default Footer;