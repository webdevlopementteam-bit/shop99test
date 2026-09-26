
import Product from "./productModel.js";
import Category from "./categoryModel.js";
import Brand from "./brandModel.js";
import User from "./userModel.js";
import Admin from "./adminModel.js";
import Wishlist from "./Wishlist.js";
import CouponUsage from "./couponUsageModel.js";
import ProductImage from "./productImageModel.js";

// 🔥 ADD THESE IMPORTS
import ProductAttribute from "./productAttributeModel.js";
import Attribute from "./attributeModel.js";
import AttributeValue from "./attributeValueModel.js";

import Offer from "./offerModel.js";
import Banner from "./bannerModel.js";


import OfferUsage from "./offerUsageModel.js";
import Coupon from "./couponModel.js";

import CategoryAttributeMap from "./categoryAttributeMapModel.js";

import ProductVariant from "./productVariantModel.js";
import ProductVariantImage from "./productVariantImageModel.js";
import ProductShippingRate from "./productShippingRateModel.js";
import ProductReview from "./productReviewModel.js";
import UserAddress from "./userAddressModel.js";

/* ================= PRODUCT RELATIONS ================= */

Product.belongsTo(Category, { foreignKey: "category_id" });
Product.belongsTo(Brand, { foreignKey: "brand_id" });

// 🔥 ADD THIS
Product.hasMany(ProductAttribute, {
  foreignKey: "product_id"
});


// Product → multiple images
Product.hasMany(ProductImage, {
  foreignKey: "product_id",
  as: "images"
});

ProductImage.belongsTo(Product, {
  foreignKey: "product_id"
});

Product.hasMany(ProductVariant, {
  foreignKey: "product_id",
  as: "variants"
});

ProductVariant.belongsTo(Product, {
  foreignKey: "product_id"
});

Product.hasMany(ProductShippingRate, {
  foreignKey: "product_id",
  as: "shippingRates"
});

ProductShippingRate.belongsTo(Product, {
  foreignKey: "product_id"
});

Product.hasMany(ProductReview, {
  foreignKey: "product_id",
  as: "reviews"
});

ProductReview.belongsTo(Product, {
  foreignKey: "product_id"
});

User.hasMany(ProductReview, {
  foreignKey: "user_id"
});

ProductReview.belongsTo(User, {
  foreignKey: "user_id"
});

User.hasMany(UserAddress, {
  foreignKey: "user_id",
  as: "addresses"
});

UserAddress.belongsTo(User, {
  foreignKey: "user_id"
});

ProductVariant.hasMany(ProductVariantImage, {
  foreignKey: "variant_id",
  as: "images"
});

/* ================= CATEGORY SELF RELATION ================= */

Category.belongsTo(Category, {
  as: "parent",
  foreignKey: "parent_id"
});

Category.hasMany(Category, {
  as: "children",
  foreignKey: "parent_id"
});


/* ================= PRODUCT ATTRIBUTE RELATIONS ================= */

// 🔥 ADD ALL THESE
ProductAttribute.belongsTo(Product, {
  foreignKey: "product_id"
});

ProductAttribute.belongsTo(Attribute, {
  foreignKey: "attribute_id"
});

ProductAttribute.belongsTo(AttributeValue, {
  foreignKey: "attribute_value_id"
});


/* ================= ATTRIBUTE RELATIONS ================= */

// optional but best practice
Attribute.hasMany(AttributeValue, {
  foreignKey: "attribute_id"
});

AttributeValue.belongsTo(Attribute, {
  foreignKey: "attribute_id"
});


/* ================= WISHLIST RELATIONS ================= */

// Many-to-Many User <-> Product
User.belongsToMany(Product, { through: Wishlist });
Product.belongsToMany(User, { through: Wishlist });

// 🔥 IMPORTANT FOR EAGER LOADING
Wishlist.belongsTo(User, { foreignKey: "UserId" });
Wishlist.belongsTo(Product, { foreignKey: "ProductId" });


/* ================= OFFER RELATIONS ================= */
Offer.belongsTo(Product, { foreignKey: "product_id" });

// coupen 

Coupon.hasMany(CouponUsage, { foreignKey: "coupon_id" });
CouponUsage.belongsTo(Coupon, { foreignKey: "coupon_id" });

User.hasMany(CouponUsage, { foreignKey: "user_id" });
CouponUsage.belongsTo(User, { foreignKey: "user_id" });



// Banner → Product
Banner.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product"
});

// Product → Banner
Product.hasMany(Banner, {
  foreignKey: "product_id",
  as: "banners"
});

/* ================= OFFER RELATIONS ================= */

// Offer → Product
Offer.belongsTo(Product, { foreignKey: "product_id" });

// 🔥 NEW (IMPORTANT)
Offer.hasMany(OfferUsage, {
  foreignKey: "offer_id",
  as: "usages"
});

OfferUsage.belongsTo(Offer, {
  foreignKey: "offer_id"
});

// 🔥 OPTIONAL (recommended)
User.hasMany(OfferUsage, {
  foreignKey: "user_id"
});

OfferUsage.belongsTo(User, {
  foreignKey: "user_id"
});



CategoryAttributeMap.belongsTo(Attribute, {
  foreignKey: "attribute_id"
});


export { Product,
  Category,
  Brand,
  User,
  Admin,
  Wishlist,
  ProductAttribute,
  Attribute,
  AttributeValue,
  Offer,
  Banner,
  Coupon,
  CategoryAttributeMap,
  ProductImage,
  ProductVariant,
  ProductVariantImage,
  ProductShippingRate,
  ProductReview,
  UserAddress };