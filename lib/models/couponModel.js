import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Coupon = sequelize.define(
  "Coupon",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },

    description: {
      type: DataTypes.STRING
    },

    discount_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },

    apply_on: {
      type: DataTypes.ENUM("all", "product", "category"),
      defaultValue: "all"
    },

    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    begin_on: {
      type: DataTypes.DATE
    },

    end_on: {
      type: DataTypes.DATE
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    usage_limit: {
      type: DataTypes.INTEGER,
      allowNull: true // null = unlimited
    },

    used_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
   discount_type: {
        type: DataTypes.ENUM("flat", "percentage"),
        defaultValue: "flat"
      },
      max_discount: {
        type: DataTypes.DECIMAL(10,2),
        allowNull: true
      }
        },
  {
    tableName: "coupons",
    timestamps: true
  }
);

export default Coupon;