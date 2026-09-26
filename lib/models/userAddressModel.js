import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const UserAddress = sequelize.define(
  "UserAddress",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Home",
    },

    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    recipient_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address_line: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    postcode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "user_addresses",
    timestamps: true,

    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default UserAddress;