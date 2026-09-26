import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const OfferUsage = sequelize.define("OfferUsage", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  offer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  used_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

export default OfferUsage;