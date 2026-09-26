import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const About = sequelize.define(
  "About",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    section_label: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    company_title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    company_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    about_image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    banner_image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    highlights: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    trust_badges: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    choose_us_title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    choose_us_subtitle: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    choose_us_cards: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    testimonials_title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    testimonials: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "about",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  }
);

export default About;
