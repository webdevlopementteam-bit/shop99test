import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Warranty = sequelize.define(
  "Warranty",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    /** "shop99" = bought on this site (order_pk required); "other" = bought elsewhere (no order) */
    purchase_source: {
      type: DataTypes.ENUM("shop99", "other"),
      allowNull: false,
      defaultValue: "shop99",
    },

    /** references orders.id (numeric PK) — only set when purchase_source = "shop99" */
    order_pk: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    /** denormalized from orders.order_id for display without a join */
    order_number: {
      type: DataTypes.STRING,
    },

    product_name: {
      type: DataTypes.STRING,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    invoice_url: {
      type: DataTypes.TEXT,
    },

    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "completed"),
      defaultValue: "pending",
    },
  },
  {
    tableName: "warranty_registrations",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Warranty;
