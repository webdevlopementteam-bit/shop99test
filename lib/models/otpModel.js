// models/otpModel.js

import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const OTP = sequelize.define(
  "OTP",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },

    otp: {
      type: DataTypes.STRING,
      allowNull: false
    },

    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    tableName: "otps",
    timestamps: true
  }
);

export default OTP;