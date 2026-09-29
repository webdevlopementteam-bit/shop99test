import { withAdmin } from "@/lib/auth.js";
import { revalidatePath } from "next/cache";
import "@/lib/models/relations.js";
import Banner from "@/lib/models/bannerModel.js";
import Product from "@/lib/models/productModel.js";
import { saveUploadedFile } from "@/lib/upload.js";

/* ================= GET ALL ================= */
export async function GET() {
  try {
    const banners = await Banner.findAll({
      include: [{ model: Product, as: "product", attributes: ["id", "name", "slug"] }],
      order: [["id", "DESC"]],
    });
    return Response.json(banners);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Server Error" }, { status: 500 });
  }
}

/* ================= CREATE ================= */
async function handlePOST(request) {
  try {
    const formData = await request.formData();
    const { title, subtitle, product_id } = Object.fromEntries(formData.entries());

    const image = await saveUploadedFile(formData.get("image"));
    const background = await saveUploadedFile(formData.get("background"));

    await Banner.create({
      title,
      subtitle,
      image,
      background,
      product_id: product_id || null,
    });
    // Homepage hero is rendered from banners at build/revalidate time.
    revalidatePath("/");

    return Response.json({ message: "Banner Created" });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Server Error" }, { status: 500 });
  }
}

export const POST = withAdmin(handlePOST);
