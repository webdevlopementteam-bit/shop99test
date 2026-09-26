import CategoryAttributeMap from "@/lib/models/categoryAttributeMapModel.js";
import Attribute from "@/lib/models/attributeModel.js";
import Category from "@/lib/models/categoryModel.js";

/* GET BY CATEGORY */
export async function GET(request, { params }) {
  const { categoryId } = await params;

  const category = await Category.findByPk(categoryId);

  let parentMapped = [];
  let extraMapped = [];

  if (category.parent_id) {
    const parent = category.parent_id;

    const parentData = await CategoryAttributeMap.findAll({ where: { category_id: parent } });
    parentMapped = parentData.map((x) => x.attribute_id);

    const extraData = await CategoryAttributeMap.findAll({
      where: { category_id: categoryId, is_extra: true },
    });
    extraMapped = extraData.map((x) => x.attribute_id);
  } else {
    const data = await CategoryAttributeMap.findAll({ where: { category_id: categoryId } });
    parentMapped = data.map((x) => x.attribute_id);
  }

  const allAttributes = await Attribute.findAll();

  return Response.json({
    all: allAttributes,
    mapped: parentMapped,
    parentMapped,
    extraMapped,
  });
}
