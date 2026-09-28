import { pickCategorySeo, saveCategorySeo, getCategorySeoById } from "@/lib/categorySeo.js";
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

const hasTruthyFlag = (...values) =>
  values.some((v) => v === true || v === 1 || v === "1" || v === "true");

/* ================= GET ONE ================= */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const data = await Category.findByPk(id);
    if (!data) return Response.json(data);
    // Plus the SEO fields for the admin edit form ("" until the columns exist).
    return Response.json({ ...data.get({ plain: true }), ...(await getCategorySeoById(id)) });
  } catch (err) {
    return Response.json(err.message, { status: 500 });
  }
}

/* ================= UPDATE ================= */
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());

    const slug = slugify(body.name);
    const category = await Category.findByPk(id);

    const oldParentId = category.parent_id;
    const newParentId = body.parent_id || null;

    const rawTax =
      body.tax_rate != null && body.tax_rate !== "" ? body.tax_rate : body.gst_percentage;
    const tax_rate =
      rawTax == null || rawTax === "" ? (category.tax_rate ?? 0) : Number(rawTax);
    if (!Number.isFinite(tax_rate) || tax_rate < 0 || tax_rate > 100) {
      return Response.json(
        { success: false, message: "Invalid GST percentage (0-100)" },
        { status: 400 },
      );
    }

    const hsn = body.hsn === undefined ? category.hsn : normalizeHsn(body.hsn);
    const image = await saveUploadedFile(formData.get("image"));
    const banner = await saveUploadedFile(formData.get("banner"));
    const shouldRemoveImage = hasTruthyFlag(body.remove_image, body.removeImage);
    const shouldRemoveBanner = hasTruthyFlag(body.remove_banner, body.removeBanner);
    const nextImage = image || (shouldRemoveImage ? null : category.image);
    const nextBanner = banner || (shouldRemoveBanner ? null : category.banner);

    await Category.update(
      {
        name: body.name,
        slug,
        parent_id: newParentId,
        tax_rate,
        hsn,
        is_publish: body.is_publish === "true" || body.is_publish == 1,
        is_top_category: Number(body.is_top_category) || 0,
        image: nextImage,
        banner: nextBanner,
      },
      { where: { id } },
    );

    await syncCategoryHsnToProducts(id, hsn);
    const seoSaved = await saveCategorySeo(id, pickCategorySeo(body));

    if (newParentId) {
      await Category.update({ is_parent: true }, { where: { id: newParentId } });
    }

    if (oldParentId && oldParentId !== newParentId) {
      const count = await Category.count({ where: { parent_id: oldParentId } });
      if (count === 0) {
        await Category.update({ is_parent: false }, { where: { id: oldParentId } });
      }
    }

    return Response.json({ success: true, seoSaved });
  } catch (err) {
    console.log(err);
    return Response.json(err.message, { status: 500 });
  }
}

/* ================= DELETE ================= */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const category = await Category.findByPk(id);
    if (!category) {
      return Response.json("Category not found", { status: 404 });
    }

    const product = await Product.findOne({ where: { category_id: id } });
    if (product) {
      return Response.json("Cannot delete: Category has products", { status: 400 });
    }

    const child = await Category.findOne({ where: { parent_id: id } });
    if (child) {
      return Response.json("Cannot delete: Category has subcategories", { status: 400 });
    }

    const parentId = category.parent_id;

    await Category.destroy({ where: { id } });

    if (parentId) {
      const count = await Category.count({ where: { parent_id: parentId } });
      if (count === 0) {
        await Category.update({ is_parent: false }, { where: { id: parentId } });
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    console.log("DELETE ERROR:", err);
    return Response.json(err.message, { status: 500 });
  }
}
