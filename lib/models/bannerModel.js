import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Banner = sequelize.define(
  "Banner",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    title: {
      type: DataTypes.STRING,
      allowNull: false
    },

    subtitle: {
      type: DataTypes.STRING,
      allowNull: true
    },

    image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    background: {
      type: DataTypes.STRING,
      allowNull: true
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  
  {
    tableName: "banners",
    timestamps: false
  }
);

export default Banner;