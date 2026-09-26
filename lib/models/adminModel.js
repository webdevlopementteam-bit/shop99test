import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Admin = sequelize.define("Admin", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

  name: DataTypes.STRING,

  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  password: DataTypes.STRING,

  role: {
    type: DataTypes.STRING,
    defaultValue: "admin",
  },

  can_delete_users: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: "admins",
  timestamps: true
});

export default Admin;
