import { withAdmin } from "@/lib/auth.js";
import { Op } from "sequelize";
import CategoryAttributeMap from "@/lib/models/categoryAttributeMapModel.js";
import Attribute from "@/lib/models/attributeModel.js";
import Category from "@/lib/models/categoryModel.js";
import Product from "@/lib/models/productModel.js";
import ProductAttribute from "@/lib/models/productAttributeModel.js";
import AttributeValue from "@/lib/models/attributeValueModel.js";

function normalizePositiveIntIds(raw) {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  const nums = arr.map((x) => parseInt(x, 10)).filter((x) => Number.isFinite(x) && x > 0);
  return [...new Set(nums)];
}

async function filterExistingAttributeIds(ids) {
  if (!ids.length) return { valid: [], invalid: [] };
  const rows = await Attribute.findAll({ where: { id: { [Op.in]: ids } }, attributes: ["id"] });
  const ok = new Set(rows.map((r) => r.id));
  const valid = ids.filter((id) => ok.has(id));
  const invalid = ids.filter((id) => !ok.has(id));
  return { valid, invalid };
}

async function handlePOST(request) {
  try {
    const { category_id, attribute_ids, apply_to_sub, extra_ids } = await request.json();

    const mainIds = normalizePositiveIntIds(attribute_ids);
    const extraIdList = normalizePositiveIntIds(extra_ids);

    const { valid: validMain, invalid: invalidMain } = await filterExistingAttributeIds(mainIds);
    const { valid: validExtra, invalid: invalidExtra } = await filterExistingAttributeIds(extraIdList);

    if (mainIds.length > 0 && validMain.length === 0) {
      return Response.json(
        {
          message:
            "None of the selected attributes exist in the database. Refresh the attributes list or remove deleted attributes.",
          invalid_attribute_ids: [...new Set([...invalidMain, ...invalidExtra])],
        },
        { status: 400 },
      );
    }

    const skipped_invalid_attribute_ids = [...new Set([...invalidMain, ...invalidExtra])];

    /* ================= CATEGORY MAPPING ================= */
    await CategoryAttributeMap.destroy({ where: { category_id } });

    const data = validMain.map((attr_id) => ({
      category_id,
      attribute_id: attr_id,
      is_extra: false,
    }));

    if (data.length > 0) {
      await CategoryAttributeMap.bulkCreate(data);
    }

    /* ================= APPLY TO SUBCATEGORY ================= */
    if (apply_to_sub) {
      const subs = await Category.findAll({ where: { parent_id: category_id } });

      for (const sub of subs) {
        await CategoryAttributeMap.destroy({ where: { category_id: sub.id } });

        const subData = validMain.map((attr_id) => ({
          category_id: sub.id,
          attribute_id: attr_id,
          is_extra: false,
        }));

        if (subData.length > 0) {
          await CategoryAttributeMap.bulkCreate(subData);
        }
      }
    }

    /* ================= EXTRA SUBCATEGORY ATTRIBUTES ================= */
    if (validExtra.length > 0) {
      const extraData = validExtra.map((attr_id) => ({
        category_id,
        attribute_id: attr_id,
        is_extra: true,
      }));

      await CategoryAttributeMap.bulkCreate(extraData);
    }

    /* ================= AUTO ASSIGN ATTRIBUTES TO PRODUCTS ================= */
    const values = await AttributeValue.findAll({ where: { attribute_id: validMain } });

    const valueMap = {};
    values.forEach((v) => {
      if (!valueMap[v.attribute_id]) {
        valueMap[v.attribute_id] = v.id;
      }
    });

    const products = await Product.findAll({ where: { category_id } });

    for (const product of products) {
      for (const attr_id of validMain) {
        const exists = await ProductAttribute.findOne({
          where: { product_id: product.id, attribute_id: attr_id },
        });

        if (!exists) {
          if (!valueMap[attr_id]) {
            console.warn("No value found for attribute:", attr_id);
            continue;
          }
        }
      }
    }

    /* ================= SUBCATEGORY PRODUCTS ================= */
    if (apply_to_sub) {
      const subs = await Category.findAll({ where: { parent_id: category_id } });

      for (const sub of subs) {
        const subProducts = await Product.findAll({ where: { category_id: sub.id } });

        for (const product of subProducts) {
          for (const attr_id of validMain) {
            const exists = await ProductAttribute.findOne({
              where: { product_id: product.id, attribute_id: attr_id },
            });

            if (!exists) {
              if (!valueMap[attr_id]) {
                console.warn("No value found for attribute:", attr_id);
                continue;
              }
            }
          }
        }
      }
    }

    return Response.json({
      success: true,
      ...(skipped_invalid_attribute_ids.length > 0 && { skipped_invalid_attribute_ids }),
    });
  } catch (err) {
    console.error(err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

export const POST = withAdmin(handlePOST);
