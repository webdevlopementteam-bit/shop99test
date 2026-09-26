import "@/lib/models/relations.js";
import Product from "@/lib/models/productModel.js";
import Category from "@/lib/models/categoryModel.js";
import Brand from "@/lib/models/brandModel.js";
import ProductVariant from "@/lib/models/productVariantModel.js";
import ProductVariantImage from "@/lib/models/productVariantImageModel.js";
import ProductShippingRate from "@/lib/models/productShippingRateModel.js";
import Offer from "@/lib/models/offerModel.js";
import ProductAttribute from "@/lib/models/productAttributeModel.js";
import Attribute from "@/lib/models/attributeModel.js";
import AttributeValue from "@/lib/models/attributeValueModel.js";
import ProductImage from "@/lib/models/productImageModel.js";
import sequelize from "@/lib/db.js";
import { saveUploadedFile, saveUploadedFiles } from "@/lib/upload.js";
import { syncProductShipping, getShippingStateRatesObject } from "@/lib/services/shippingSync.js";
import { buildMetaDescription } from "@/lib/utils/slugify.js";
import {
  bodyHasShipping,
  firstNonEmptyVariantDescription,
  firstVariantDescriptionFromDb,
  resolveProductSlug,
  parseVariantsPayload,
  shouldApplyOffersForRequest,
  resolveProductOffer,
  resolveProductOfferByIds,
  discountedPriceForOffer,
  shouldRestoreBasePriceFromOfferEcho,
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

/* ================= GET ONE ================= */
export async function GET(request, { params }) {
  try {
    const { id: identifier } = await params;
    // Storefront links by slug (SEO-friendly URLs); admin/cart/order flows
    // still pass the numeric id — this endpoint transparently supports both.
    const lookupWhere = /^\d+$/.test(String(identifier)) ? { id: identifier } : { slug: identifier };

    const product = await Product.findOne({
      where: lookupWhere,
      include: [
        { model: Category, attributes: ["id", "name"] },
        { model: Brand, attributes: ["id", "name"] },
        {
          model: ProductAttribute,
          include: [
            { model: Attribute, attributes: ["name"] },
            { model: AttributeValue, attributes: ["value"] },
          ],
        },
        { model: ProductImage, as: "images", attributes: ["image"] },
        {
          model: ProductVariant,
          as: "variants",
          attributes: VARIANT_ATTRS,
          include: [{ model: ProductVariantImage, as: "images", attributes: ["image"] }],
        },
      ],
    });

    if (!product) return Response.json({ message: "Not found" }, { status: 404 });

    const applyOffers = shouldApplyOffersForRequest(request);

    const offers = applyOffers ? await Offer.findAll({ where: { is_active: true } }) : [];

    let price = effectiveBasePrice(product);
    let old_price = effectiveBaseOldPrice(product);

    const offer = applyOffers ? resolveProductOffer(product, offers) : null;

    if (applyOffers && offer) {
      old_price = price;
      const discounted = discountedPriceForOffer(price, offer);
      price = Number.isFinite(discounted) ? discounted : price;
    }

    const formattedVariants = formatProductVariants(product, offer, { applyOffer: applyOffers });

    const formattedAttributes =
      product.ProductAttributes?.map((pa) => ({
        attribute: pa.Attribute?.name,
        value: pa.AttributeValue?.value,
        attribute_id: pa.attribute_id,
        attribute_value_id: pa.attribute_value_id,
      })) || [];

    const shipping_state_rates = await getShippingStateRatesObject(product.id);
    const pj = product.toJSON();

    return Response.json({
      ...pj,
      attributes: formattedAttributes,
      variants: formattedVariants,
      specifications:
        typeof product.specifications === "string" ? JSON.parse(product.specifications) : product.specifications,
      shipping_mode: pj.shipping_mode || "free",
      shipping_flat_fee: pj.shipping_flat_fee != null ? Number(pj.shipping_flat_fee) : 0,
      shipping_state_rates,
      price,
      old_price,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ message: "Failed to fetch product" }, { status: 500 });
  }
}

/* ================= UPDATE ================= */
export async function PUT(request, { params }) {
  try {
    const { id: idRaw } = await params;
    const productId = parseInt(idRaw, 10);

    const formData = await request.formData();
    const body = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));

    const parsedVariants = parseVariantsPayload(body.variants);
    if (body.variants != null && parsedVariants == null) {
      return Response.json({ message: "Invalid variants JSON" }, { status: 400 });
    }

    const currentProduct = await Product.findByPk(productId, {
      attributes: ["id", "category_id", "slug", "name"],
    });
    if (!currentProduct) {
      return Response.json({ message: "Product not found" }, { status: 404 });
    }

    const name = String(body.name || currentProduct.name || "").trim();
    if (!name) {
      return Response.json({ message: "Product name is required" }, { status: 400 });
    }

    let slugPatch = {};
    if (body.slug !== undefined) {
      const slugResult = await resolveProductSlug({
        name,
        requestedSlug: body.slug,
        currentSlug: currentProduct.slug,
        excludeId: productId,
      });
      if (slugResult.error) {
        return Response.json({ message: slugResult.error }, { status: 400 });
      }
      slugPatch = { slug: slugResult.slug };
    }

    let metaPatch = {};
    if (body.meta_title !== undefined) {
      metaPatch.meta_title = String(body.meta_title).trim() || name;
    }
    if (body.meta_description !== undefined) {
      const source =
        firstNonEmptyVariantDescription(parsedVariants) || (await firstVariantDescriptionFromDb(productId)) || name;
      metaPatch.meta_description = String(body.meta_description).trim() || buildMetaDescription(source);
    }

    let safeVariantsPayload = parsedVariants;
    if (Array.isArray(parsedVariants) && parsedVariants.length > 0) {
      if (currentProduct) {
        const activeOffers = await Offer.findAll({ where: { is_active: true } });
        const activeOffer = resolveProductOfferByIds(
          productId,
          body.category_id || currentProduct.category_id,
          activeOffers,
        );

        if (activeOffer) {
          const existingVariants = await ProductVariant.findAll({
            where: { product_id: productId },
            attributes: ["id", "price", "old_price"],
          });
          const byId = new Map(existingVariants.map((v) => [Number(v.id), v]));

          safeVariantsPayload = parsedVariants.map((variant) => {
            const variantId = Number(variant?.id);
            const existing = Number.isFinite(variantId) ? byId.get(variantId) : null;
            if (!existing) return variant;

            if (!shouldRestoreBasePriceFromOfferEcho(variant.price, existing.price, activeOffer)) {
              return variant;
            }

            return {
              ...variant,
              price: Number(existing.price),
              old_price: existing.old_price != null && existing.old_price !== "" ? Number(existing.old_price) : null,
            };
          });
        }
      }
    }

    const data = {
      category_id: parseInt(body.category_id),
      brand_id: body.brand_id ? parseInt(body.brand_id) : null,
      name,
      ...slugPatch,
      ...metaPatch,
      sku: body.sku != null && String(body.sku).trim() !== "" ? String(body.sku).trim() : null,
      hsn: body.hsn != null && String(body.hsn).trim() !== "" ? String(body.hsn).trim() : null,
      fsn: body.fsn != null && String(body.fsn).trim() !== "" ? String(body.fsn).trim() : null,
      is_cod: body.is_cod == 1 ? 1 : 0,
      in_stock: body.in_stock == 1 || body.in_stock === true || body.in_stock === "true" || body.in_stock === "1",
    };

    const image = await saveUploadedFile(formData.get("image"));
    if (image) {
      data.image = image;
    }

    const galleryFilenames = await saveUploadedFiles(formData, "gallery");

    await sequelize.transaction(async (t) => {
      await Product.update(data, { where: { id: productId }, transaction: t });

      if (Array.isArray(parsedVariants)) {
        await replaceProductVariants(productId, safeVariantsPayload, t);
      }

      if (galleryFilenames.length > 0) {
        await ProductImage.destroy({ where: { product_id: productId }, transaction: t });

        const images = galleryFilenames.map((filename) => ({ product_id: productId, image: filename }));

        await ProductImage.bulkCreate(images, { transaction: t });
      }
    });

    if (bodyHasShipping(body)) {
      await syncProductShipping(productId, body);
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

/* ================= DELETE ================= */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await ProductShippingRate.destroy({ where: { product_id: id } });
    await Product.destroy({ where: { id } });

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ message: "Delete failed" }, { status: 500 });
  }
}
