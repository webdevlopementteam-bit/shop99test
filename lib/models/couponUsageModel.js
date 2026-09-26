import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const CouponUsage = sequelize.define(
  "CouponUsage",
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

    coupon_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    used_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "coupon_usages",
    timestamps: true,
  }
);

export default CouponUsage;