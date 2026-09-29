import { withAdmin } from "@/lib/auth.js";
import { Op } from "sequelize";
import "@/lib/models/relations.js";
import Product from "@/lib/models/productModel.js";
import Category from "@/lib/models/categoryModel.js";
import Brand from "@/lib/models/brandModel.js";
import ProductVariant from "@/lib/models/productVariantModel.js";
import ProductVariantImage from "@/lib/models/productVariantImageModel.js";
import Offer from "@/lib/models/offerModel.js";
import ProductAttribute from "@/lib/models/productAttributeModel.js";
import Attribute from "@/lib/models/attributeModel.js";
import AttributeValue from "@/lib/models/attributeValueModel.js";
import CategoryAttributeMap from "@/lib/models/categoryAttributeMapModel.js";
import ProductImage from "@/lib/models/productImageModel.js";
import sequelize from "@/lib/db.js";
import { saveUploadedFile, saveUploadedFiles } from "@/lib/upload.js";
import { syncProductShipping } from "@/lib/services/shippingSync.js";
import { buildMetaDescription } from "@/lib/utils/slugify.js";
import {
  bodyHasShipping,
  firstNonEmptyVariantDescription,
  resolveProductSlug,
  parseVariantsPayload,
  shouldApplyOffersForRequest,
  discountedPriceForOffer,
  effectiveBasePrice,
  effectiveBaseOldPrice,
  replaceProductVariants,
  formatProductVariants,
} from "@/lib/productHelpers.js";

const VARIANT_ATTRS = [
  "id",
  "product_id",
  "variantAttrs",
  "short_description",
  "price",
  "old_price",
  "stock",
  "specifications",
  "image",
];

/* ================= GET ALL ================= */
export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page") || 1;
    const limit = searchParams.get("limit") || 12;
    const category = searchParams.get("category");
    const brand = searchParams.get("brand");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const inStock = searchParams.get("inStock");
    const sort = searchParams.get("sort");

    const offset = (page - 1) * limit;
    const where = {};

    if (category) where["$Category.name$"] = category;
    if (brand) where["$Brand.name$"] = brand;

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = minPrice;
      if (maxPrice) where.price[Op.lte] = maxPrice;
    }

    if (inStock === "true") where.in_stock = true;

    let order = [["id", "DESC"]];
    if (sort === "low") order = [["price", "ASC"]];
    if (sort === "high") order = [["price", "DESC"]];
    if (sort === "newest") order = [["id", "DESC"]];

    const { rows, count } = await Product.findAndCountAll({
      where,
      distinct: true,
      include: [
        { model: Category, attributes: ["id", "name"], required: !!category },
        { model: Brand, attributes: ["id", "name"], required: !!brand },
        {
          model: ProductAttribute,
          include: [
            { model: Attribute, attributes: ["name"] },
            { model: AttributeValue, attributes: ["value"] },
          ],
        },
        {
          model: ProductVariant,
          as: "variants",
          attributes: VARIANT_ATTRS,
          include: [{ model: ProductVariantImage, as: "images", attributes: ["image"] }],
        },
      ],
      order,
      limit: parseInt(limit, 10),
      offset,
    });

    const applyOffers = shouldApplyOffersForRequest(request);

    const offers = applyOffers ? await Offer.findAll({ where: { is_active: true } }) : [];

    const products = await Promise.all(
      rows.map(async (product) => {
        let price = effectiveBasePrice(product);
        let old_price = effectiveBaseOldPrice(product);

        const grouped = {};
        product.ProductAttributes?.forEach((pa) => {
          const attr = pa.Attribute?.name;
          const value = pa.AttributeValue?.value;
          if (!attr || !value) return;
          if (!grouped[attr]) grouped[attr] = [];
          grouped[attr].push(value);
        });

        let formattedAttributes = Object.entries(grouped).map(([attribute, values]) => ({
          attribute,
          values: [...new Set(values)],
        }));

        const hasProductAttributes = product.ProductAttributes && product.ProductAttributes.length > 0;

        if (!hasProductAttributes) {
          const categoryAttrs = await CategoryAttributeMap.findAll({
            where: { category_id: product.category_id },
            include: [{ model: Attribute, attributes: ["name"] }],
          });

          formattedAttributes = categoryAttrs.map((a) => ({ attribute: a.Attribute?.name, values: [] }));
        }

        let offer = null;
        if (applyOffers) {
          const productOffer = offers.find((o) => o.apply_on === "product" && o.product_id === product.id);
          const categoryOffer = offers.find(
            (o) => o.apply_on === "category" && o.category_id === product.category_id,
          );
          const globalOffer = offers.find((o) => o.apply_on === "all");
          offer = productOffer || categoryOffer || globalOffer;
        }

        if (applyOffers && offer) {
          old_price = price;
          const discounted = discountedPriceForOffer(price, offer);
          price = Number.isFinite(discounted) ? discounted : price;
        }

        const formattedVariants = formatProductVariants(product, offer, { applyOffer: applyOffers });

        return {
          ...product.toJSON(),
          attributes: formattedAttributes,
          variants: formattedVariants,
          specifications:
            typeof product.specifications === "string"
              ? JSON.parse(product.specifications)
              : product.specifications,
          price,
          old_price,
        };
      }),
    );

    return Response.json({
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / limit),
      data: products,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ message: "Failed to fetch products" }, { status: 500 });
  }
}

/* ================= CREATE ================= */
async function handlePOST(request) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));

    const parsedVariants = parseVariantsPayload(body.variants);
    if (body.variants != null && parsedVariants == null) {
      return Response.json({ message: "Invalid variants JSON" }, { status: 400 });
    }

    const name = String(body.name || "").trim();
    if (!name) {
      return Response.json({ message: "Product name is required" }, { status: 400 });
    }

    const slugResult = await resolveProductSlug({
      name,
      requestedSlug: body.slug,
      currentSlug: null,
      excludeId: null,
    });
    if (slugResult.error) {
      return Response.json({ message: slugResult.error }, { status: 400 });
    }

    const metaTitle = String(body.meta_title || "").trim() || name;
    const metaDescription =
      String(body.meta_description || "").trim() ||
      buildMetaDescription(firstNonEmptyVariantDescription(parsedVariants) || name);

    const inStock = body.in_stock == 1 || body.in_stock === true || body.in_stock === "true" || body.in_stock === "1";

    const image = await saveUploadedFile(formData.get("image"));
    const galleryFilenames = await saveUploadedFiles(formData, "gallery");

    const product = await sequelize.transaction(async (t) => {
      const created = await Product.create(
        {
          category_id: parseInt(body.category_id),
          brand_id: body.brand_id ? parseInt(body.brand_id) : null,
          name,
          slug: slugResult.slug,
          meta_title: metaTitle,
          meta_description: metaDescription,
          sku: body.sku != null && String(body.sku).trim() !== "" ? String(body.sku).trim() : null,
          hsn: body.hsn != null && String(body.hsn).trim() !== "" ? String(body.hsn).trim() : null,
          fsn: body.fsn != null && String(body.fsn).trim() !== "" ? String(body.fsn).trim() : null,
          is_cod: body.is_cod == 1 ? 1 : 0,
          in_stock: inStock,
          price: null,
          old_price: null,
          image,
        },
        { transaction: t },
      );

      if (galleryFilenames.length > 0) {
        const images = galleryFilenames.map((filename) => ({ product_id: created.id, image: filename }));
        await ProductImage.bulkCreate(images, { transaction: t });
      }

      if (Array.isArray(parsedVariants)) {
        await replaceProductVariants(created.id, parsedVariants, t);
      }

      return created;
    });

    if (bodyHasShipping(body)) {
      await syncProductShipping(product.id, body);
    }

    return Response.json({ success: true, data: product });
  } catch (err) {
    console.error(err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

export const POST = withAdmin(handlePOST);
