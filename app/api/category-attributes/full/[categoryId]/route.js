import CategoryAttributeMap from "@/lib/models/categoryAttributeMapModel.js";
import Attribute from "@/lib/models/attributeModel.js";
import AttributeValue from "@/lib/models/attributeValueModel.js";

export async function GET(request, { params }) {
  try {
    const { categoryId } = await params;

    const mappings = await CategoryAttributeMap.findAll({ where: { category_id: categoryId } });
    const attributeIds = mappings.map((m) => m.attribute_id);

    const attributes = await Attribute.findAll({
      where: { id: attributeIds },
      include: [{ model: AttributeValue, attributes: ["id", "value"] }],
    });

    return Response.json(attributes);
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}
