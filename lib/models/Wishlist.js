import { DataTypes } from "sequelize";
import sequelize from "../db.js";

import User from "./userModel.js";
import Product from "./productModel.js";

const Wishlist = sequelize.define(
  "Wishlist",
  {},
  { timestamps: true }
);

User.belongsToMany(Product, { through: Wishlist });
Product.belongsToMany(User, { through: Wishlist });

export default Wishlist;