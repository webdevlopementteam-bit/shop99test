import { withAdmin } from "@/lib/auth.js";
import ProductAttribute from "@/lib/models/productAttributeModel.js";
import AttributeValue from "@/lib/models/attributeValueModel.js";

async function handlePOST(request) {
  try {
    const { product_id, attributes } = await request.json();

    if (product_id == null || product_id === "") {
      return Response.json({ message: "product_id required" }, { status: 400 });
    }

    const pid = Number(product_id);
    if (!Number.isFinite(pid) || pid <= 0) {
      return Response.json({ message: "Invalid product_id" }, { status: 400 });
    }

    await ProductAttribute.destroy({ where: { product_id: pid } });

    const data = [];
    const seen = new Set();

    for (const a of attributes || []) {
      if (!a.attribute_id) continue;

      const attrId = Number(a.attribute_id);
      if (!Number.isFinite(attrId) || attrId <= 0) continue;

      if (typeof a.attribute_value_id === "string") {
        const parts = a.attribute_value_id.split(",");
        for (const val of parts) {
          const trimmed = val.trim();
          if (!trimmed) continue;
          const num = Number(trimmed);
          if (!Number.isFinite(num) || num <= 0) continue;
          const key = `${attrId}-${num}`;
          if (seen.has(key)) continue;
          seen.add(key);
          data.push({ product_id: pid, attribute_id: attrId, attribute_value_id: num });
        }
        continue;
      }

      const rawVid = a.attribute_value_id;
      let valueId = rawVid != null && rawVid !== "" ? Number(rawVid) : NaN;

      if (!Number.isFinite(valueId) || valueId <= 0) {
        const text = a.value != null && String(a.value).trim() !== "" ? String(a.value).trim() : null;
        if (!text) continue;

        const [row] = await AttributeValue.findOrCreate({
          where: { attribute_id: attrId, value: text },
          defaults: { attribute_id: attrId, value: text },
        });
        valueId = row.id;
      }

      if (!Number.isFinite(valueId) || valueId <= 0) continue;

      const key = `${attrId}-${valueId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      data.push({ product_id: pid, attribute_id: attrId, attribute_value_id: valueId });
    }

    if (data.length > 0) {
      await ProductAttribute.bulkCreate(data);
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

export const POST = withAdmin(handlePOST);
