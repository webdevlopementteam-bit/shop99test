import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const NewsletterSubscription = sequelize.define(
  "NewsletterSubscription",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "newsletter_subscriptions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

export default NewsletterSubscription;
