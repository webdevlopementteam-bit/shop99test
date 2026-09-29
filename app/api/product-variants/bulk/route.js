import { withAdmin } from "@/lib/auth.js";
import path from "node:path";
import sequelize from "@/lib/db.js";
import ProductVariant from "@/lib/models/productVariantModel.js";
import ProductVariantImage from "@/lib/models/productVariantImageModel.js";
import Product from "@/lib/models/productModel.js";
import {
  normalizeVariantSpecificationsForStorage,
  coerceIncomingVariantFields,
  parseJsonIfString,
} from "@/lib/utils/variantSpecifications.js";
import { sanitizeRichText } from "@/lib/utils/richText.js";
import { saveUploadedFile } from "@/lib/upload.js";

const VARIANT_CREATE_FIELDS = [
  "product_id",
  "variantAttrs",
  "short_description",
  "heading",
  "price",
  "old_price",
  "stock",
  "specifications",
  "image",
];

function normalizeVariantAttrs(raw) {
  const parsed = parseJsonIfString(raw);
  const use = parsed !== undefined ? parsed : raw;
  if (use != null && typeof use === "object" && !Array.isArray(use)) {
    return use;
  }
  return {};
}

async function syncProductFromVariants(product_id) {
  const list = await ProductVariant.findAll({ where: { product_id } });
  if (list.length === 0) {
    await Product.update({ price: null, old_price: null, in_stock: false }, { where: { id: product_id } });
    return;
  }
  const nums = list.map((v) => Number(v.price)).filter((n) => !Number.isNaN(n));
  const minP = nums.length ? Math.min(...nums) : null;
  const minVar = minP != null ? list.find((v) => Number(v.price) === minP) : null;
  const oldP = minVar && minVar.old_price != null && minVar.old_price !== "" ? Number(minVar.old_price) : null;
  const anyStock = list.some((v) => Number(v.stock) > 0);
  await Product.update(
    { price: minP, old_price: Number.isFinite(oldP) ? oldP : null, in_stock: anyStock },
    { where: { id: product_id } },
  );
}

function sanitizeStoredFilename(name) {
  if (typeof name !== "string") return "";
  const base = path.basename(name.trim());
  return base && base !== "." && base !== ".." ? base : "";
}

/**
 * Groups every File in the FormData by field name, mirroring multer's
 * upload.any() -> req.files (array) -> grouped-by-fieldname shape.
 */
async function filesGroupedByFieldname(formData) {
  const by = {};
  for (const [key, value] of formData.entries()) {
    if (value && typeof value !== "string" && value.name) {
      const filename = await saveUploadedFile(value);
      if (filename) {
        if (!by[key]) by[key] = [];
        by[key].push({ fieldname: key, filename });
      }
    }
  }
  return by;
}

/* ================= BULK SAVE ================= */
async function handlePOST(request) {
  const formData = await request.formData();
  const body = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => typeof v === "string"),
  );

  const product_id = parseInt(body.product_id, 10);
  if (!Number.isFinite(product_id) || product_id <= 0) {
    console.error("product-variants/bulk: invalid product_id");
    return Response.json({ message: "Invalid or missing product_id" }, { status: 400 });
  }

  let variants = body.variants;
  if (typeof variants === "string") {
    try {
      variants = JSON.parse(variants);
    } catch (e) {
      return Response.json({ message: "Invalid variants JSON" }, { status: 400 });
    }
  }
  if (!Array.isArray(variants)) {
    return Response.json({ message: "variants must be an array" }, { status: 400 });
  }

  const filesByField = await filesGroupedByFieldname(formData);

  try {
    await sequelize.transaction(async (t) => {
      const oldVariants = await ProductVariant.findAll({ where: { product_id }, transaction: t });
      const variantIds = oldVariants.map((v) => v.id);

      if (variantIds.length > 0) {
        await ProductVariantImage.destroy({ where: { variant_id: variantIds }, transaction: t });
      }

      await ProductVariant.destroy({ where: { product_id }, transaction: t });

      let variantIndex = 0;

      for (const v of variants) {
        const { specs, specsHeading, heading: variantHeading } = coerceIncomingVariantFields(v);

        const variant = await ProductVariant.create(
          {
            product_id,
            variantAttrs: normalizeVariantAttrs(v.attributes),
            short_description: sanitizeRichText(v.short_description) || null,
            heading: variantHeading,
            price: Number(v.price) || 0,
            old_price: v.old_price != null && v.old_price !== "" ? Number(v.old_price) : null,
            stock: Number(v.stock) || 0,
            specifications: normalizeVariantSpecificationsForStorage(specs, specsHeading),
            image: v.image ? sanitizeStoredFilename(v.image) : null,
          },
          { fields: VARIANT_CREATE_FIELDS, transaction: t },
        );

        const newFiles = filesByField[`variant_images_${variantIndex}`] || [];

        const existingRaw = v.existing_images ?? v.keep_images ?? v.saved_images ?? [];
        const existingList = Array.isArray(existingRaw) ? existingRaw : [];

        const rows = [];

        for (const item of existingList) {
          const fn =
            typeof item === "string"
              ? sanitizeStoredFilename(item)
              : sanitizeStoredFilename(item?.image ?? item?.filename ?? item?.path ?? "");
          if (fn) rows.push({ variant_id: variant.id, image: fn });
        }

        for (const file of newFiles) {
          if (file.filename) {
            rows.push({ variant_id: variant.id, image: file.filename });
          }
        }

        if (rows.length > 0) {
          await ProductVariantImage.bulkCreate(rows, { transaction: t });
        }

        variantIndex++;
      }
    });

    await syncProductFromVariants(product_id);

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

export const POST = withAdmin(handlePOST);
