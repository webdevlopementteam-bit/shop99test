import { withAdmin } from "@/lib/auth.js";
import Brand from "@/lib/models/brandModel.js";
import { saveUploadedFile } from "@/lib/upload.js";

async function handlePUT(request, { params }) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const data = { name: formData.get("name") };

    const image = await saveUploadedFile(formData.get("image"));
    if (image) data.image = image;

    await Brand.update(data, { where: { id } });

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ message: "Brand update failed" }, { status: 500 });
  }
}

async function handleDELETE(request, { params }) {
  try {
    const { id } = await params;
    await Brand.destroy({ where: { id } });
    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ message: "Brand delete failed" }, { status: 500 });
  }
}

export const PUT = withAdmin(handlePUT);

export const DELETE = withAdmin(handleDELETE);
