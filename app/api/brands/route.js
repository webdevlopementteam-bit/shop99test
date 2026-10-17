import { withAdmin } from "@/lib/auth.js";
import Brand from "@/lib/models/brandModel.js";
import { listBrands } from "@/lib/storefrontLists.js";
import { saveUploadedFile } from "@/lib/upload.js";

export async function GET() {
  try {
    return Response.json(await listBrands());
  } catch (err) {
    console.error(err);
    return Response.json({ message: "Failed to fetch brands" }, { status: 500 });
  }
}

async function handlePOST(request) {
  try {
    const formData = await request.formData();
    const name = formData.get("name");
    const image = await saveUploadedFile(formData.get("image"));

    await Brand.create({ name, image });

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ message: "Brand create failed" }, { status: 500 });
  }
}

export const POST = withAdmin(handlePOST);
