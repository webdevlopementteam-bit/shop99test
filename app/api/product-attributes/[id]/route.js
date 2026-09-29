import { withAdmin } from "@/lib/auth.js";
import ProductAttribute from "@/lib/models/productAttributeModel.js";

/* GET BY PRODUCT — :id here is actually the productId (matches original route's :productId) */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const data = await ProductAttribute.findAll({ where: { product_id: id } });
    return Response.json(data);
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}

/* UPDATE VALUE — :id here is the ProductAttribute row id */
async function handlePUT(request, { params }) {
  try {
    const { id } = await params;
    const { attribute_value_id } = await request.json();

    await ProductAttribute.update({ attribute_value_id }, { where: { id } });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}

export const PUT = withAdmin(handlePUT);
