import { withAdmin } from "@/lib/auth.js";
import { pickCategorySeo, saveCategorySeo } from "@/lib/categorySeo.js";
import "@/lib/models/relations.js";
import Category from "@/lib/models/categoryModel.js";
import Product from "@/lib/models/productModel.js";
import { saveUploadedFile } from "@/lib/upload.js";

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");

const normalizeHsn = (value) =>
  value != null && String(value).trim() !== "" ? String(value).trim() : null;

const syncCategoryHsnToProducts = (categoryId, hsn) =>
  Product.update({ hsn }, { where: { category_id: categoryId } });

/* ================= GET ALL ================= */
export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pageRaw = searchParams.get("page");
    const limitRaw = searchParams.get("limit");

    /* ================= FRONTEND (NO PAGINATION) ================= */
    if (!pageRaw || !limitRaw) {
      const data = await Category.findAll({
        where: { is_publish: 1 },
        order: [["id", "DESC"]],
        include: [{ model: Category, as: "parent", attributes: ["id", "name"] }],
      });

      return Response.json({ categories: data, totalPages: 1, currentPage: 1 });
    }

    /* ================= ADMIN (WITH PAGINATION) ================= */
    const page = parseInt(pageRaw);
    const limit = parseInt(limitRaw);
    const offset = (page - 1) * limit;

    const { count, rows } = await Category.findAndCountAll({
      limit,
      offset,
      order: [["id", "DESC"]],
      include: [{ model: Category, as: "parent", attributes: ["id", "name"] }],
    });

    return Response.json({
      categories: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (err) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}

/* ================= CREATE ================= */
async function handlePOST(request) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());

    const slug = slugify(body.name);

    const rawTax =
      body.tax_rate != null && body.tax_rate !== "" ? body.tax_rate : body.gst_percentage;
    const tax_rate = rawTax == null || rawTax === "" ? 0 : Number(rawTax);
    if (!Number.isFinite(tax_rate) || tax_rate < 0 || tax_rate > 100) {
      return Response.json(
        { success: false, message: "Invalid GST percentage (0-100)" },
        { status: 400 },
      );
    }

    const hsn = normalizeHsn(body.hsn);
    const image = await saveUploadedFile(formData.get("image"));
    const banner = await saveUploadedFile(formData.get("banner"));

    const newCategory = await Category.create({
      name: body.name,
      slug,
      parent_id: body.parent_id || null,
      tax_rate,
      hsn,
      is_publish: Number(body.is_publish) || 0,
      is_top_category: Number(body.is_top_category) || 0,
      image,
      banner,
    });

    if (body.parent_id) {
      await Category.update({ is_parent: true }, { where: { id: body.parent_id } });
    }

    await syncCategoryHsnToProducts(newCategory.id, hsn);
    const seoSaved = await saveCategorySeo(newCategory.id, pickCategorySeo(body));

    return Response.json({ success: true, data: newCategory, seoSaved });
  } catch (err) {
    console.log(err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}

export const POST = withAdmin(handlePOST);
