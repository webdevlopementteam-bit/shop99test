import { withAdmin } from "@/lib/auth.js";
import Attribute from "@/lib/models/attributeModel.js";
import AttributeValue from "@/lib/models/attributeValueModel.js";

/* UPDATE */
async function handlePUT(request, { params }) {
  try {
    const { id } = await params;
    const { name, is_published, variants } = await request.json();

    await Attribute.update({ name, is_published }, { where: { id } });

    if (variants) {
      await AttributeValue.destroy({ where: { attribute_id: id } });
      const values = variants.map((v) => ({ value: v, attribute_id: id }));
      await AttributeValue.bulkCreate(values);
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}

/* DELETE */
async function handleDELETE(request, { params }) {
  try {
    const { id } = await params;

    await AttributeValue.destroy({ where: { attribute_id: id } });
    await Attribute.destroy({ where: { id } });

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

export const PUT = withAdmin(handlePUT);

export const DELETE = withAdmin(handleDELETE);
