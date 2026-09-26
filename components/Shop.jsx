"use client";

import { useState, useEffect, useMemo } from "react";
import { getProductsApi, getCategoriesApi, getBrandsApi, getWishlistApi, addToWishlistApi, removeWishlistApi, BASE_URL } from "@/lib/api";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useCart } from "@/context/CartContext";
import { toast } from "react-toastify";
import { useSearchParams, useRouter } from "next/navigation";
import Pagination from "@/components/Pagination";
import { countProductVariantsInPayload } from "@/lib/productVariants";

export default function ShopPage() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(100000);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const searchParams = useSearchParams();

  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [stockFilter, setStockFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const brandParam = searchParams.get("brand");

  const router = useRouter();

  const sidebarCategories = useMemo(() => {
    if (!Array.isArray(categories) || categories.length === 0) return [];

    const parentIds = new Set();
    categories.forEach((cat) => {
      const rawPid = cat.parent_id ?? cat.parentId ?? cat.ParentId ?? cat.parent_category_id ?? cat.parentCategoryId;
      if (rawPid !== null && rawPid !== undefined && rawPid !== "") {
        parentIds.add(String(rawPid));
      }
    });

    // Sidebar me parent category names hide rahenge.
    return categories
      .filter((cat) => !parentIds.has(String(cat.id)))
      .slice()
      .reverse();
  }, [categories]);

  const selectedCategoryRow = useMemo(() => {
    if (!Array.isArray(categories) || categories.length === 0) return null;
    if (!selectedCategory) return null;
    return categories.find((c) => String(c.id) === String(selectedCategory)) || null;
  }, [categories, selectedCategory]);

  const shopBannerSrc = useMemo(() => {
    const bannerFile = selectedCategoryRow?.banner;
    if (!bannerFile) return "";
    return `${BASE_URL}/uploads/${bannerFile}`;
  }, [selectedCategoryRow]);

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    const load = async () => {
      try {
        const categoryMain = searchParams.get("category") || "";
        const subCategory = searchParams.get("subCategory") || "";
        const searchText = searchParams.get("search");
        const selectedBrandObj = brands.find((b) => String(b.id) === String(selectedBrand));
        const selectedBrandNameForApi = selectedBrandObj?.name ? String(selectedBrandObj.name).trim() : "";

        const categoryForApi = subCategory || categoryMain;

        const productRes = await getProductsApi({
          category: categoryForApi,
          brand: selectedBrandNameForApi || selectedBrand || undefined,
          brand_name: selectedBrandNameForApi || undefined,
          brand_id: selectedBrand || undefined,
          brandId: selectedBrand || undefined,
          search: searchText || "",
          page,
          limit: 20,
        });

        const rows = productRes?.data?.data || productRes?.data || [];
        setProducts(Array.isArray(rows) ? rows : []);

        const meta = productRes?.data?.meta ?? productRes?.meta;
        const tp = meta?.totalPages ?? productRes?.totalPages;
        if (typeof tp === "number" && tp >= 1) {
          setTotalPages(tp);
        }

        const categoryRes = await getCategoriesApi();
        const brandRes = await getBrandsApi();

        const categoryRows = Array.isArray(categoryRes) ? categoryRes : categoryRes?.categories || [];
        setCategories(categoryRows);
        setBrands(brandRes || []);
      } catch (err) {
        console.error("Shop Load Error:", err);
        setProducts([]);
      }
    };

    load();
  }, [searchParams, page, selectedBrand, brands]);

  useEffect(() => {
    setPage(1);
  }, [selectedBrand]);

  /** Match sidebar highlight: prefer subCategory (leaf) over parent name */
  useEffect(() => {
    const top = searchParams.get("category");
    const sub = searchParams.get("subCategory");
    const nameToSelect = sub || top;

    if (!categories.length) {
      return;
    }

    if (nameToSelect) {
      const found = categories.find((c) => c.name === nameToSelect);
      if (found) {
        setSelectedCategory(found.id);
        return;
      }
    }

    setSelectedCategory(null);
  }, [searchParams, categories]);

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        const res = await getWishlistApi();

        const ids = res.data.map((item) => item.product_id);

        setWishlistIds(ids);
      } catch (err) {
        console.log("Wishlist load error", err);
      }
    };

    loadWishlist();
  }, []);

  useEffect(() => {
    if (!brands.length) return;

    // URL me brand ho tabhi selectedBrand sync karo.
    // Nahi to user ka manual radio selection preserve rahe.
    if (!brandParam) return;

    const normalized = String(brandParam).trim().toLowerCase();
    const found = brands.find((b) => {
      const idMatch = String(b.id) === normalized;
      const nameMatch = String(b.name || "").trim().toLowerCase() === normalized;
      return idMatch || nameMatch;
    });

    setSelectedBrand(found ? String(found.id) : "");
  }, [brandParam, brands]);

  const toggleWishlist = async (id) => {
    try {
      if (wishlistIds.includes(id)) {
        await removeWishlistApi(id);

        setWishlistIds(wishlistIds.filter((w) => w !== id));

        toast.success("Removed from wishlist");
      } else {
        await addToWishlistApi(id);

        setWishlistIds([...wishlistIds, id]);

        toast.success("Added to wishlist ❤️");
      }
    } catch (err) {
      console.log("Wishlist error", err.response);

      toast.error("Wishlist action failed");
    }
  };
  /* ================= FILTER LOGIC ================= */

  const searchText = searchParams.get("search") || "";
  const selectedBrandRow = brands.find((b) => String(b.id) === String(selectedBrand));
  const selectedBrandName = String(selectedBrandRow?.name || "")
    .trim()
    .toLowerCase();

  const filteredProducts = products.filter((p) => {
    const price = Number(p.price);

    const categoryMatch = !selectedCategory || Number(p.category_id) === Number(selectedCategory);

    const productBrandId = p.brand_id ?? p.brandId ?? p.BrandId ?? p.brand?.id ?? p.Brand?.id;
    const productBrandName = String(p.brand_name ?? p.brandName ?? p.brand?.name ?? p.Brand?.name ?? "")
      .trim()
      .toLowerCase();

    const brandMatch =
      !selectedBrand || String(productBrandId) === String(selectedBrand) || (selectedBrandName && productBrandName === selectedBrandName);

    const stockMatch = stockFilter === "all" ? !inStockOnly || p.in_stock : stockFilter === "in" ? p.in_stock : !p.in_stock;

    const priceMatch = price <= maxPrice;

    // 🔥 SEARCH MATCH (IMPORTANT)
    const searchMatch = !searchText || p.name.toLowerCase().includes(searchText.toLowerCase());

    return categoryMatch && brandMatch && stockMatch && priceMatch && searchMatch;
  });
  /* ================= UI ================= */

  return (
    <>
      <div className="bg-gray-100 min-h-screen">
        {/* HEADER BANNER (only when selected category has banner) */}
        {shopBannerSrc ? (
          <div className="relative rounded-2xl overflow-hidden mb-8">
            <img src={shopBannerSrc} alt="Category Banner" className="w-full h-[125px] md:h-[250px] lg:h-[350px] object-cover" />
          </div>
        ) : null}

        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {/* MOBILE FILTER BUTTON */}
          <div className="lg:hidden flex justify-between items-center mb-4">
            <p className="text-sm font-medium">Showing {filteredProducts.length} results</p>

            <button
              onClick={() => setShowMobileFilter(!showMobileFilter)}
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm"
            >
              <i className="ri-filter-3-line"></i> Filters
            </button>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* SIDEBAR FILTER */}
            <div
              className={`
        bg-white rounded-xl shadow p-5 space-y-6
        ${showMobileFilter ? "block" : "hidden"}
        lg:block
        `}
            >
              {/* Close button only mobile */}
              <div className="flex justify-between items-center lg:hidden mb-4">
                <h3 className="font-semibold text-lg">Filters</h3>
                <button onClick={() => setShowMobileFilter(false)}>✕</button>
              </div>

              {/* Categories */}
              <div>
                <FilterTitle text="Categories" />

                <FilterBtn
                  text="All"
                  active={!selectedCategory}
                  onClick={() => {
                    router.push("/shop");
                    setShowMobileFilter(false);
                  }}
                />

                {sidebarCategories.map((c) => (
                  <FilterBtn
                    key={c.id}
                    text={c.name}
                    active={selectedCategory === c.id}
                    onClick={() => {
                      router.push(`/shop?category=${encodeURIComponent(c.name)}`);
                      setShowMobileFilter(false);
                    }}
                  />
                ))}
              </div>

              {/* Price */}
              <div>
                <FilterTitle text="Filter by Price" />
                <input
                  type="range"
                  min="100"
                  max="100000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full"
                />
                <p className="text-sm mt-1">Up to ₹{maxPrice}</p>
              </div>

              {/* Stock */}

              <div>
                <FilterTitle text="Product Status" />

                {/* OLD CHECKBOX (same rahega) */}
                <label className="flex gap-2 text-sm">
                  <input type="checkbox" checked={inStockOnly} onChange={() => setInStockOnly(!inStockOnly)} />
                  In Stock Only
                </label>

                {/* ✅ YAHI ADD KARNA HAI (checkbox ke niche) */}
                <div className="mt-2 space-y-1 text-sm">
                  <label className="flex gap-2">
                    <input type="radio" name="stock" checked={stockFilter === "all"} onChange={() => setStockFilter("all")} />
                    All
                  </label>

                  <label className="flex gap-2">
                    <input type="radio" name="stock" checked={stockFilter === "in"} onChange={() => setStockFilter("in")} />
                    In Stock
                  </label>

                  <label className="flex gap-2">
                    <input type="radio" name="stock" checked={stockFilter === "out"} onChange={() => setStockFilter("out")} />
                    Out of Stock
                  </label>
                </div>
              </div>

              {/* Brand */}
              <div>
                <FilterTitle text="Brand" />

                {/* ALL BRANDS */}
                <label className="flex gap-2 text-sm mb-2 cursor-pointer">
                  <input type="radio" name="brand" checked={selectedBrand === ""} onChange={() => setSelectedBrand("")} />
                  <span className={!selectedBrand ? "text-orange-500 font-semibold" : ""}>All Brands</span>
                </label>

                {/* DYNAMIC BRANDS */}
                {brands?.map((b) => (
                  <label key={b.id} className="flex gap-2 text-sm mb-1 cursor-pointer">
                    <input type="radio" name="brand" checked={String(selectedBrand) === String(b.id)} onChange={() => setSelectedBrand(String(b.id))} />

                    <span className={`${String(selectedBrand) === String(b.id) ? "text-orange-500 font-semibold" : ""}`}>{b.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* PRODUCTS SECTION */}
            <div className="lg:col-span-3 flex flex-col min-h-[760px]">
              {/* Desktop result text */}
              <div className="hidden lg:flex justify-between mb-5">
                <p className="text-sm">Showing {filteredProducts.length} results</p>
              </div>

              <div
                className="grid
          grid-cols-2
          sm:grid-cols-2
          md:grid-cols-3
          lg:grid-cols-3
          xl:grid-cols-4
          gap-4 sm:gap-5 content-start"
              >
                {filteredProducts.map((item) => (
                  <ProductCard key={item.id} item={item} setPreviewImage={setPreviewImage} toggleWishlist={toggleWishlist} wishlistIds={wishlistIds} />
                ))}
              </div>

              <div className="mt-auto pt-6">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </div>
          </div>
        </div>

        {previewImage && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setPreviewImage(null)}>
            <img src={previewImage} className="max-h-[80vh] rounded-lg" />
          </div>
        )}
      </div>
    </>
  );
}

/* ================= COMPONENTS ================= */

function FilterTitle({ text }) {
  return <h3 className="font-semibold mb-2">{text}</h3>;
}

function FilterBtn({ text, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`block w-full text-left px-3 py-2 rounded mb-1 text-sm
      ${active ? "bg-orange-500 text-white" : "hover:bg-gray-100"}`}
    >
      {text}
    </button>
  );
}

/* ================= PRODUCT CARD ================= */

function ProductCard({ item }) {
  const router = useRouter();
  const { addToCart } = useCart();

  const imageUrl = item.image ? `${BASE_URL}/uploads/${item.image}` : "/no-image.png";

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (countProductVariantsInPayload(item) > 1) {
      router.push(`/productPage/${item.slug || item.id}`);
      toast.info("Please select a product variant first. The price will be saved according to the selected variant.");
      return;
    }
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: imageUrl,
      category_id: item.category_id,
    });

    toast.success("Product added to cart 🛒");
  };

  return (
    <div
      onClick={() => router.push(`/productPage/${item.slug || item.id}`)}
      className="group bg-white rounded-xl shadow p-4 hover:shadow-lg transition flex flex-col cursor-pointer hover:scale-[1.02]"
    >
      {/* IMAGE AREA */}
      <div className="relative">
        <img src={imageUrl} className="h-32 sm:h-40 w-full object-contain mb-3 transition duration-300 group-hover:opacity-30" />
      </div>

      {/* CATEGORY */}
      <p className="text-xs text-gray-400">{item.category}</p>

      {/* TITLE */}
      <h3 className="text-sm font-medium mb-2 line-clamp-2">{item.name}</h3>

      {/* PRICE */}
      <div className="flex gap-2 items-center">
        <span className="text-red-500 font-semibold">₹{Number(item.price).toFixed(2)}</span>

        {item.old_price && <span className="line-through text-gray-400 text-sm">₹{Number(item.old_price).toFixed(2)}</span>}
      </div>

      {/* STOCK */}
      <p className={`text-xs mt-2 ${item.in_stock ? "text-green-600" : "text-red-500"}`}>{item.in_stock ? "In Stock" : "Out of Stock"}</p>

      {/* BUTTON */}
      {item.in_stock ? (
        <button onClick={handleAddToCart} className="w-full bg-orange-500 text-white py-2 sm:py-3 rounded-lg font-semibold mt-3 text-sm sm:text-base">
          Add to Cart
        </button>
      ) : (
        <button className="w-full bg-gray-400 text-white py-2 mt-3 rounded-lg text-sm cursor-not-allowed">Out of Stock</button>
      )}
    </div>
  );
}
