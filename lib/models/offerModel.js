import { DataTypes } from "sequelize";
import sequelize from "../db.js";


const Offer = sequelize.define(
  "Offer",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    offer_name: {
      type: DataTypes.STRING,
      allowNull: false, // ✅ important
    },

    description: DataTypes.STRING,

    discount_type: {
      type: DataTypes.ENUM("flat", "percent"),
      allowNull: false, // ✅ important
    },

    discount_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false, // ✅ important
    },

    apply_on: {
      type: DataTypes.ENUM("all", "category", "product"),
      defaultValue: "all",
    },

    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    begin_on: {
      type: DataTypes.DATE,
      allowNull: false, // ✅ important
    },

    end_on: {
      type: DataTypes.DATE,
      allowNull: false, // ✅ important
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    usage_limit: {
        type: DataTypes.INTEGER,
        allowNull: true, // null = unlimited
      },

      used_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      per_user_limit: {
      type: DataTypes.INTEGER,
      allowNull: true // null = unlimited
    },
  },
  {
    tableName: "offers",
    timestamps: false, // 🔥 recommend ON
  }
);


export default Offer;