
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

// Dev-only safety: Turbopack HMR re-runs this file when one model file changes
// while the other model classes stay cached, and re-adding an existing alias
// throws SequelizeAssociationError. Each association is added only if the
// source model doesn't have it yet (default aliases follow Sequelize's naming).
function link(source, type, target, options = {}) {
  const plural = type === "hasMany" || type === "belongsToMany";
  const alias = options.as ?? (plural ? target.options.name.plural : target.options.name.singular);
  if (source.associations[alias]) return;
  source[type](target, options);
}

/* ================= PRODUCT RELATIONS ================= */

link(Product, "belongsTo", Category, { foreignKey: "category_id" });
link(Product, "belongsTo", Brand, { foreignKey: "brand_id" });

// 🔥 ADD THIS
link(Product, "hasMany", ProductAttribute, {
  foreignKey: "product_id"
});


// Product → multiple images
link(Product, "hasMany", ProductImage, {
  foreignKey: "product_id",
  as: "images"
});

link(ProductImage, "belongsTo", Product, {
  foreignKey: "product_id"
});

link(Product, "hasMany", ProductVariant, {
  foreignKey: "product_id",
  as: "variants"
});

link(ProductVariant, "belongsTo", Product, {
  foreignKey: "product_id"
});

link(Product, "hasMany", ProductShippingRate, {
  foreignKey: "product_id",
  as: "shippingRates"
});

link(ProductShippingRate, "belongsTo", Product, {
  foreignKey: "product_id"
});

link(Product, "hasMany", ProductReview, {
  foreignKey: "product_id",
  as: "reviews"
});

link(ProductReview, "belongsTo", Product, {
  foreignKey: "product_id"
});

link(User, "hasMany", ProductReview, {
  foreignKey: "user_id"
});

link(ProductReview, "belongsTo", User, {
  foreignKey: "user_id"
});

link(User, "hasMany", UserAddress, {
  foreignKey: "user_id",
  as: "addresses"
});

link(UserAddress, "belongsTo", User, {
  foreignKey: "user_id"
});

link(ProductVariant, "hasMany", ProductVariantImage, {
  foreignKey: "variant_id",
  as: "images"
});

/* ================= CATEGORY SELF RELATION ================= */

link(Category, "belongsTo", Category, {
  as: "parent",
  foreignKey: "parent_id"
});

link(Category, "hasMany", Category, {
  as: "children",
  foreignKey: "parent_id"
});


/* ================= PRODUCT ATTRIBUTE RELATIONS ================= */

// 🔥 ADD ALL THESE
link(ProductAttribute, "belongsTo", Product, {
  foreignKey: "product_id"
});

link(ProductAttribute, "belongsTo", Attribute, {
  foreignKey: "attribute_id"
});

link(ProductAttribute, "belongsTo", AttributeValue, {
  foreignKey: "attribute_value_id"
});


/* ================= ATTRIBUTE RELATIONS ================= */

// optional but best practice
link(Attribute, "hasMany", AttributeValue, {
  foreignKey: "attribute_id"
});

link(AttributeValue, "belongsTo", Attribute, {
  foreignKey: "attribute_id"
});


/* ================= WISHLIST RELATIONS ================= */

// Many-to-Many User <-> Product
link(User, "belongsToMany", Product, { through: Wishlist });
link(Product, "belongsToMany", User, { through: Wishlist });

// 🔥 IMPORTANT FOR EAGER LOADING
link(Wishlist, "belongsTo", User, { foreignKey: "UserId" });
link(Wishlist, "belongsTo", Product, { foreignKey: "ProductId" });


/* ================= OFFER RELATIONS ================= */
link(Offer, "belongsTo", Product, { foreignKey: "product_id" });

// coupen 

link(Coupon, "hasMany", CouponUsage, { foreignKey: "coupon_id" });
link(CouponUsage, "belongsTo", Coupon, { foreignKey: "coupon_id" });

link(User, "hasMany", CouponUsage, { foreignKey: "user_id" });
link(CouponUsage, "belongsTo", User, { foreignKey: "user_id" });



// Banner → Product
link(Banner, "belongsTo", Product, {
  foreignKey: "product_id",
  as: "product"
});

// Product → Banner
link(Product, "hasMany", Banner, {
  foreignKey: "product_id",
  as: "banners"
});

/* ================= OFFER RELATIONS ================= */

// Offer → Product
link(Offer, "belongsTo", Product, { foreignKey: "product_id" });

// 🔥 NEW (IMPORTANT)
link(Offer, "hasMany", OfferUsage, {
  foreignKey: "offer_id",
  as: "usages"
});

link(OfferUsage, "belongsTo", Offer, {
  foreignKey: "offer_id"
});

// 🔥 OPTIONAL (recommended)
link(User, "hasMany", OfferUsage, {
  foreignKey: "user_id"
});

link(OfferUsage, "belongsTo", User, {
  foreignKey: "user_id"
});



link(CategoryAttributeMap, "belongsTo", Attribute, {
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