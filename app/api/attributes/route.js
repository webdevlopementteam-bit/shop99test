import Attribute from "@/lib/models/attributeModel.js";
import AttributeValue from "@/lib/models/attributeValueModel.js";

/* CREATE */
export async function POST(request) {
  try {
    const { name, is_published, variants } = await request.json();

    const attribute = await Attribute.create({
      name,
      is_published: is_published ?? false,
    });

    if (variants && variants.length) {
      const values = variants.map((v) => ({ value: v, attribute_id: attribute.id }));
      await AttributeValue.bulkCreate(values);
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

/* GET ALL */
export async function GET() {
  try {
    const data = await Attribute.findAll({
      include: [{ model: AttributeValue, attributes: ["id", "value"] }],
    });
    return Response.json(data);
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}
