/**
 * Category label for filters / UI — supports nested Category, lowercase category, string category.
 */
export function getProductCategoryLabel(product) {
  if (!product || typeof product !== "object") return null;

  const fromNested =
    product.Category?.name ??
    product.category?.name ??
    product.Category?.title ??
    product.category?.title;

  if (fromNested != null && String(fromNested).trim() !== "") {
    const s = String(fromNested).trim();
    if (s.toLowerCase() === "category") return null;
    return s;
  }

  if (typeof product.category === "string" && product.category.trim() !== "") {
    const s = product.category.trim();
    if (s.toLowerCase() === "category") return null;
    return s;
  }

  if (
    typeof product.category_name === "string" &&
    product.category_name.trim() !== ""
  ) {
    return product.category_name.trim();
  }

  return null;
}
