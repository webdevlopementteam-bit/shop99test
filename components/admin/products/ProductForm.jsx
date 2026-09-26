"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "react-toastify";
import { X, Layers, Plus, Trash2 } from "lucide-react";
import {
  createProductApi,
  updateProductApi,
  getProductByIdApi,
  getCategoriesApi,
  getCategoryByIdApi,
  getBrandsApi,
  getCategoryAttributesFullApi,
  assignProductAttributesApi,
  saveProductVariantsApi,
  deleteProductVariantApi,
  getProductShippingApi,
  putProductShippingApi,
  BASE_URL,
} from "@/lib/adminApi";
import { INDIAN_STATES } from "@/lib/constants/indianStates";
import { parseSpecificationsBulkText } from "@/lib/specificationsBulkPaste";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

function newVariantImageKey() {
  return `vimg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const VARIANT_HIDDEN_MARKER_KEY = "__variant_hidden__";

/** Stable React list key per variant row — must NOT depend on typed field values */
function newVariantRowKey() {
  return `vrow-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Split "Red, Blue, Green" into separate options for variants */
function expandCommaSeparatedAttributeValues(value) {
  const s = String(value ?? "").trim();
  if (!s) return [];
  const parts = s.split(/[,，]\s*/).map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts : [s];
}

function normalizeSpecTable(spec, knownKeys = []) {
  const parseLegacyItemsStringToRows = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return null;

    // Format 1: "Brand:SoundBoss, warranty:2 years"
    const colonPairs = raw
      .split(/[,，]\s*/)
      .map((x) => x.trim())
      .filter(Boolean)
      .map((segment) => {
        const idx = segment.indexOf(":");
        if (idx < 0) return null;
        const k = segment.slice(0, idx).trim();
        const v = segment.slice(idx + 1).trim();
        if (!k && !v) return null;
        return [k, v];
      })
      .filter(Boolean);
    if (colonPairs.length > 0) return colonPairs;

    const parts = raw.split(/[,，]\s*/).map((x) => x.trim()).filter(Boolean);

    // Format 2 (smart): "Color,pink, light pink,brand,soundxboss"
    // Keep comma inside value until next likely key appears.
    const likelyKeys = new Set([
      "color",
      "brand",
      "size",
      "screen size",
      "ram",
      "storage",
      "rom",
      "model",
      "material",
      "age group",
      "warranty",
      "type",
      "convenience features",
      "maximum output power",
      ...knownKeys.map((k) => String(k ?? "").trim().toLowerCase()).filter(Boolean),
    ]);
    if (parts.length >= 3) {
      const smartRows = [];
      let currentKey = "";
      let currentVals = [];
      for (let idx = 0; idx < parts.length; idx += 1) {
        const token = parts[idx];
        const lower = token.toLowerCase();
        const isKey = likelyKeys.has(lower);
        if (!currentKey) {
          currentKey = token;
          continue;
        }
        if (isKey) {
          smartRows.push([currentKey, currentVals.join(", ").trim()]);
          currentKey = token;
          currentVals = [];
          continue;
        }
        currentVals.push(token);
      }
      if (currentKey) {
        smartRows.push([currentKey, currentVals.join(", ").trim()]);
      }
      const valid = smartRows.filter(([k, v]) => k && v);
      if (valid.length > 0) return valid;
    }

    // Format 3 fallback: "Brand,SoundBoss,warranty,2 years"
    if (parts.length >= 2 && parts.length % 2 === 0) {
      const rows = [];
      for (let i = 0; i < parts.length; i += 2) {
        rows.push([parts[i], parts[i + 1]]);
      }
      return rows;
    }

    return null;
  };

  const toCell = (val) => {
    if (val == null) return "";
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (Array.isArray(val)) return val.map((x) => toCell(x)).join(", ");
    if (typeof val === "object") {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  const to2D = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return [["", ""]];
    return rows.map((r) => {
      if (Array.isArray(r)) return r.map((cell) => toCell(cell));
      if (r && typeof r === "object") return Object.values(r).map((cell) => toCell(cell));
      return [toCell(r)];
    });
  };

  if (spec == null) return [["", ""]];
  /** API often stores specifications as a JSON string — parse first */
  if (typeof spec === "string") {
    const t = spec.trim();
    if (!t) return [["", ""]];
    try {
      return normalizeSpecTable(JSON.parse(t));
    } catch {
      return [["", ""]];
    }
  }
  if (Array.isArray(spec)) {
    if (spec.length === 0) return [["", ""]];
    if (Array.isArray(spec[0])) {
      const rows = to2D(spec);
      const headingRow = rows.find(
        (r) => String(r?.[0] ?? "").trim().toLowerCase() === "heading",
      );
      const itemsRow = rows.find(
        (r) => String(r?.[0] ?? "").trim().toLowerCase() === "items",
      );
      if (itemsRow) {
        const parsedRows = parseLegacyItemsStringToRows(itemsRow[1]);
        if (parsedRows?.length) return parsedRows;
      }
      const filtered = rows.filter((r) => {
        const key = String(r?.[0] ?? "").trim().toLowerCase();
        return key !== "heading" && key !== "items";
      });
      if (filtered.length > 0) return filtered;
      if (headingRow?.[1]) return [["", ""]];
      return rows;
    }
    if (spec[0] && typeof spec[0] === "object") {
      const objectRows = spec;
      const commonTwoColKeys =
        objectRows.length > 0 &&
        objectRows.every(
          (row) =>
            row &&
            typeof row === "object" &&
            (
              ("heading" in row && "items" in row) ||
              ("key" in row && "value" in row) ||
              ("name" in row && "value" in row)
            ),
        );
      if (commonTwoColKeys) {
        const normalizedRows = [];
        objectRows.forEach((row) => {
          if ("heading" in row && "items" in row) {
            const rowItems = row.items;
            if (
              Array.isArray(rowItems) &&
              rowItems.length > 0 &&
              Array.isArray(rowItems[0])
            ) {
              const tbl = to2D(rowItems);
              normalizedRows.push(...tbl);
              return;
            }
            const parsedRows = parseLegacyItemsStringToRows(
              typeof rowItems === "string" ? rowItems : "",
            );
            if (parsedRows?.length) {
              normalizedRows.push(...parsedRows);
              return;
            }
            normalizedRows.push([toCell(row.heading), toCell(row.items)]);
            return;
          }
          if ("key" in row && "value" in row) {
            normalizedRows.push([toCell(row.key), toCell(row.value)]);
            return;
          }
          normalizedRows.push([toCell(row.name), toCell(row.value)]);
        });
        return normalizedRows.length ? normalizedRows : [["", ""]];
      }

      // Generic object-array table: derive stable columns from all keys.
      const keys = [];
      objectRows.forEach((row) => {
        Object.keys(row || {}).forEach((k) => {
          if (!keys.includes(k)) keys.push(k);
        });
      });
      if (keys.length === 0) return [["", ""]];
      const rows = objectRows.map((row) => keys.map((k) => toCell(row?.[k])));
      return rows.length ? rows : [["", ""]];
    }
    return [["", ""]];
  }
  if (typeof spec === "object") {
    if ("items" in spec) {
      const it = spec.items;
      if (Array.isArray(it) && it.length > 0 && Array.isArray(it[0])) {
        return to2D(it);
      }
      if (typeof it === "string") {
        const parsedRows = parseLegacyItemsStringToRows(it);
        if (parsedRows?.length) return parsedRows;
      }
    }

    if (Array.isArray(spec.values)) {
      const values2D = to2D(spec.values);
      if (values2D.length > 0) return values2D;
    }
    if (Array.isArray(spec.rows)) {
      const rows2D = to2D(spec.rows);
      if (rows2D.length > 0) return rows2D;
    }
    if (Array.isArray(spec.data)) {
      const data2D = to2D(spec.data);
      if (data2D.length > 0) return data2D;
    }
    const rows = Object.entries(spec).map(([k, v]) => [String(k), String(v)]);
    return rows.length ? rows : [["", ""]];
  }
  return [["", ""]];
}

/** Title `specifications_heading` field mein rahe — spec table mein `heading` pseudo-row mat dikhao */
function stripHeadingPseudoRowsFromSpecTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [["", ""]];
  const filtered = rows.filter(
    (r) =>
      Array.isArray(r) &&
      String(r[0] ?? "").trim().toLowerCase() !== "heading",
  );
  return filtered.length > 0 ? filtered : [["", ""]];
}

function pickVariantSpecificationsRaw(v) {
  return (
    v.specifications ??
    v.variant_specifications ??
    v.variantSpecifications ??
    v.specification ??
    v.Specification ??
    null
  );
}

function extractHeadingFromSpecRaw(spec) {
  if (spec == null) return "";
  if (typeof spec === "string") {
    const t = spec.trim();
    if (!t) return "";
    try {
      return extractHeadingFromSpecRaw(JSON.parse(t));
    } catch {
      return "";
    }
  }
  if (Array.isArray(spec)) {
    if (spec.length > 0 && Array.isArray(spec[0])) {
      const row = spec.find(
        (r) =>
          Array.isArray(r) &&
          String(r?.[0] ?? "").trim().toLowerCase() === "heading",
      );
      return row?.[1] ? String(row[1]).trim() : "";
    }
    if (spec.length > 0 && typeof spec[0] === "object") {
      for (const row of spec) {
        const v =
          row?.heading ??
          row?.specifications_heading ??
          row?.specification_heading ??
          row?.specificationsHeading;
        if (v != null && String(v).trim()) return String(v).trim();
      }
    }
    return "";
  }
  if (typeof spec === "object") {
    const v =
      spec.heading ??
      spec.specifications_heading ??
      spec.specification_heading ??
      spec.specificationsHeading;
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function pickSpecificationsHeading(v) {
  const keys = [
    "specifications_heading",
    "specs_heading",
    "specification_heading",
    "specificationsHeading",
    "specHeading",
    "specsHeading",
    "heading",
    "variant_heading",
  ];
  for (const k of keys) {
    const val = v?.[k];
    if (val != null && String(val).trim() !== "") return String(val).trim();
  }
  const fromSpec = extractHeadingFromSpecRaw(pickVariantSpecificationsRaw(v));
  if (fromSpec) return fromSpec;
  return "";
}

/** Card title: attributes → spec table first row → index. */
function getVariantCardHeading(v, index) {
  const attrs = v?.attributes;
  if (Array.isArray(attrs) && attrs.length > 0) {
    const label = attrs
      .map((a) => {
        const name = String(a?.attribute ?? "").trim();
        const val = String(a?.value ?? "").trim();
        if (name && val) return `${name}: ${val}`;
        if (val) return val;
        return "";
      })
      .filter(Boolean)
      .join(" · ");
    if (label) return label;
  }
  const st = v?.specTable || [["", ""]];
  const first = Array.isArray(st) ? st[0] : null;
  if (Array.isArray(first) && first.length >= 2) {
    const k = String(first[0] ?? "").trim();
    const val = String(first[1] ?? "").trim();
    if (k && val) return `${k}: ${val}`;
    if (val) return val;
  }
  return `Variant #${index + 1}`;
}

function firstFiniteVariantNumber(...candidates) {
  for (const c of candidates) {
    if (c == null || c === "") continue;
    const n = Number(c);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toVariantHiddenFlag(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const s = String(value ?? "").trim().toLowerCase();
  if (!s) return false;
  return (
    s === "1" ||
    s === "true" ||
    s === "yes" ||
    s === "hidden" ||
    s === "inactive" ||
    s === "disabled" ||
    s === "off"
  );
}

function buildVariantAttributeSignature(attrList) {
  const normalized = (Array.isArray(attrList) ? attrList : [])
    .map((a) => {
      const k = String(a?.attribute ?? "").trim().toLowerCase();
      const v = String(a?.value ?? "").trim().toLowerCase();
      if (!k || !v) return "";
      return `${k}=${v}`;
    })
    .filter(Boolean)
    .sort();
  return normalized.join("&");
}

function splitVariantHiddenMarkerFromSpecTable(rows, attrSignature) {
  if (!Array.isArray(rows)) {
    return { rows: [["", ""]], hiddenFromMarker: false };
  }
  let hiddenFromMarker = false;
  const filtered = rows.filter((r) => {
    if (!Array.isArray(r)) return true;
    const key = String(r[0] ?? "").trim().toLowerCase();
    const val = String(r[1] ?? "").trim();
    const valLower = val.toLowerCase();
    if (key !== VARIANT_HIDDEN_MARKER_KEY) return true;
    if (valLower.startsWith("sig:")) {
      const markerSig = val.slice(4).trim().toLowerCase();
      if (markerSig && markerSig === String(attrSignature || "").toLowerCase()) {
        hiddenFromMarker = true;
      }
    }
    return false;
  });
  return { rows: filtered.length ? filtered : [["", ""]], hiddenFromMarker };
}

function withVariantHiddenMarker(rows, isHidden, attrSignature) {
  const baseRows = Array.isArray(rows) ? rows : [["", ""]];
  const cleanRows = baseRows.filter((r) => {
    if (!Array.isArray(r)) return true;
    return String(r[0] ?? "").trim().toLowerCase() !== VARIANT_HIDDEN_MARKER_KEY;
  });
  if (!isHidden) return cleanRows.length ? cleanRows : [["", ""]];
  const sig = String(attrSignature ?? "").trim();
  if (!sig) return cleanRows.length ? cleanRows : [["", ""]];
  return [
    ...cleanRows,
    [VARIANT_HIDDEN_MARKER_KEY, `sig:${sig}`],
  ];
}

/**
 * Admin edit page should show the canonical/base selling price.
 * Offer-adjusted fields (sale/final/discounted) are storefront concerns only.
 */
function pickAdminVariantSellingPrice(v) {
  // Admin selling must remain actual stored selling price.
  return firstFiniteVariantNumber(v.price, v.selling_price, v.base_price);
}

function pickAdminVariantMrp(v, resolvedSellingPrice) {
  const explicitMrp = firstFiniteVariantNumber(
    v.mrp,
    v.MRP,
    v.original_mrp,
    v.originalMrp,
    v.base_mrp,
    v.baseMrp,
    v.regular_mrp,
    v.regularMrp,
  );
  if (explicitMrp != null) return explicitMrp;

  const oldPrice = firstFiniteVariantNumber(v.old_price, v.oldPrice);
  if (oldPrice != null) return oldPrice;

  // Last-resort fallback: keep MRP at least equal to selling.
  return resolvedSellingPrice != null ? Number(resolvedSellingPrice) : null;
}

/** Normalize API variant row into local variantData shape */
function normalizeVariantFromApi(v) {
  let rawAttrs =
    v.attributes ??
    v.variant_attributes ??
    v.VariantAttributes ??
    [];
  if (typeof rawAttrs === "string") {
    try {
      rawAttrs = JSON.parse(rawAttrs);
    } catch {
      rawAttrs = [];
    }
  }
  let attrList = [];
  if (Array.isArray(rawAttrs)) {
    attrList = rawAttrs
      .map((a) => ({
        attribute: String(
          a.attribute ??
            a.name ??
            a.attribute_name ??
            a.Attribute?.name ??
            "",
        ).trim(),
        value: String(
          a.value ??
            a.attribute_value ??
            a.AttributeValue?.value ??
            "",
        ).trim(),
      }))
      .filter((a) => (a.attribute && a.value) || a.value);
  } else if (rawAttrs && typeof rawAttrs === "object") {
    attrList = Object.entries(rawAttrs).map(([k, val]) => ({
      attribute: String(k).trim(),
      value: String(val ?? "").trim(),
    }));
  }

  const rawImgs = v.images ?? v.variant_images ?? v.VariantImages ?? [];
  const imgs = Array.isArray(rawImgs) ? rawImgs : [];
  const canonicalSelling = pickAdminVariantSellingPrice(v);
  const canonicalMrp = pickAdminVariantMrp(v, canonicalSelling);

  const vid = v.id ?? v.variant_id ?? v.product_variant_id;
  const normalizedSpecTable = stripHeadingPseudoRowsFromSpecTable(
    normalizeSpecTable(
      pickVariantSpecificationsRaw(v),
      attrList.map((a) => a.attribute),
    ),
  );
  const attrSignature = buildVariantAttributeSignature(attrList);
  const { rows: specTableWithoutHiddenMarker, hiddenFromMarker } =
    splitVariantHiddenMarkerFromSpecTable(normalizedSpecTable, attrSignature);

  const hiddenFromFields =
    v.visible != null
      ? !toVariantHiddenFlag(v.visible)
      : toVariantHiddenFlag(
          v.is_hidden ??
          v.isHidden ??
          v.hidden ??
          v.visibility,
        );

  return {
    /** DB id — delete via `deleteProductVariantApi` when removing card in edit mode */
    id: vid != null && vid !== "" ? vid : undefined,
    _rowKey:
      vid != null ? `api-vrow-${vid}` : newVariantRowKey(),
    attributes: attrList,
    price: canonicalSelling != null ? String(canonicalSelling) : "",
    stock: v.stock != null && v.stock !== "" ? String(v.stock) : "",
    old_price: canonicalMrp != null ? String(canonicalMrp) : "",
    short_description:
      v.short_description != null && v.short_description !== ""
        ? String(v.short_description)
        : "",
    is_hidden: hiddenFromFields || hiddenFromMarker,
    specifications_heading: pickSpecificationsHeading(v),
    specTable: specTableWithoutHiddenMarker,
    images: imgs.map((img, idx) => {
      if (img && typeof img === "object") {
        const path = img.image ?? img.path ?? img.filename ?? img.url ?? "";
        const id = img.id;
        const url =
          typeof path === "string" && path.startsWith("http")
            ? path
            : path
              ? `${BASE_URL}/uploads/${path}`
              : "";
        return {
          key:
            id != null
              ? `ex-vimg-${id}-${idx}`
              : `ex-vimg-${idx}-${String(path)}`,
          kind: "existing",
          dbId: id,
          previewUrl: url,
          storedName:
            typeof path === "string" && !path.startsWith("http")
              ? path
              : path?.split?.("/uploads/")?.pop?.() ?? "",
        };
      }
      const path = String(img);
      return {
        key: `ex-vimg-${idx}-${path}`,
        kind: "existing",
        dbId: null,
        previewUrl: path.startsWith("http")
          ? path
          : `${BASE_URL}/uploads/${path}`,
        storedName: path.includes("/uploads/")
          ? path.split("/uploads/").pop()
          : path,
      };
    }),
  };
}

const ProductForm = ({ editId }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedAttributes, setSelectedAttributes] = useState([]);
  const [variantData, setVariantData] = useState([]);

  const [useSameVariantImages, setUseSameVariantImages] = useState(false);

  const [variantDeleteInFlight, setVariantDeleteInFlight] = useState(false);
  /** `null` = modal closed; number = variant index pending delete confirmation */
  const [pendingDeleteVariantIndex, setPendingDeleteVariantIndex] =
    useState(null);
  /** `null` = closed; number = variant index for bulk spec paste modal */
  const [bulkSpecVariantIndex, setBulkSpecVariantIndex] = useState(null);
  const [bulkSpecText, setBulkSpecText] = useState("");

  const variantDataRef = useRef(variantData);
  variantDataRef.current = variantData;

  /** Shared across every variant's editor instance — must stay referentially
   * stable or Jodit reinitializes (losing focus/cursor) on each render. */
  const joditConfig = useMemo(
    () => ({
      readonly: false,
      height: 200,
      placeholder: "Variant-specific description",
      toolbarAdaptive: false,
      buttons: [
        "bold",
        "italic",
        "underline",
        "|",
        "ul",
        "ol",
        "|",
        "link",
        "|",
        "align",
        "|",
        "undo",
        "redo",
      ],
    }),
    [],
  );

  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [attributes, setAttributes] = useState([]);

  /* ================= FORM STATE (product-level only; matches API) ================= */
  const [form, setForm] = useState({
    category_id: "",
    brand_id: "",
    name: "",
    slug: "",
    meta_title: "",
    meta_description: "",
    sku: "",
    hsn: "",
    fsn: "",
    is_cod: 0,
    in_stock: 1,
    image: null,
  });

  const [shippingMode, setShippingMode] = useState("free");
  const [shippingFlatFee, setShippingFlatFee] = useState("");
  const [shippingStateRows, setShippingStateRows] = useState([
    { state: "", fee: "" },
  ]);

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      const cats = await getCategoriesApi();
      setCategories(cats);

      const brs = await getBrandsApi();
      setBrands(brs);

      if (editId) {
        const product = await getProductByIdApi(editId);

        let hsnVal = product.hsn != null ? String(product.hsn) : "";
        if (!String(hsnVal).trim() && product.category_id) {
          try {
            const cat = await getCategoryByIdApi(product.category_id);
            if (cat?.hsn != null && String(cat.hsn).trim() !== "") {
              hsnVal = String(cat.hsn).trim();
            }
          } catch {
            /* keep product hsn */
          }
        }

        setForm({
          category_id: product.category_id ?? "",
          brand_id: product.brand_id ?? "",
          name: product.name ?? "",
          slug: product.slug ?? "",
          meta_title: product.meta_title ?? "",
          meta_description: product.meta_description ?? "",
          sku: product.sku ?? "",
          hsn: hsnVal,
          fsn: product.fsn ?? "",
          is_cod: product.is_cod ? 1 : 0,
          in_stock:
            product.in_stock === false ||
            product.in_stock === 0 ||
            product.in_stock === "0"
              ? 0
              : 1,
          image: null,
        });

        const apiVariants =
          product.variants ??
          product.product_variants ??
          product.ProductVariants ??
          [];

        let categoryAttrs = [];
        if (product.category_id) {
          categoryAttrs = await getCategoryAttributesFullApi(
            product.category_id,
          );
          setAttributes(categoryAttrs);
        }

        const normalizedVariants = Array.isArray(apiVariants)
          ? apiVariants.map(normalizeVariantFromApi)
          : [];

        const selectedAttrIds = new Set();
        for (const v of normalizedVariants) {
          for (const a of v.attributes || []) {
            const attrName = String(a.attribute ?? a.name ?? "")
              .trim()
              .toLowerCase();
            if (!attrName) continue;
            const found = categoryAttrs.find(
              (row) =>
                String(row.name ?? "").trim().toLowerCase() === attrName,
            );
            if (found?.id) selectedAttrIds.add(found.id);
          }
        }
        setSelectedAttributes([...selectedAttrIds]);

        if (product.image) {
          setPreview(`${BASE_URL}/uploads/${product.image}`);
        }

        if (normalizedVariants.length > 0) {
          setVariantData(normalizedVariants);
        }

        const applyShippingFromProduct = () => {
          setShippingMode(product.shipping_mode || "free");
          setShippingFlatFee(
            product.shipping_flat_fee != null &&
              product.shipping_flat_fee !== ""
              ? String(product.shipping_flat_fee)
              : "",
          );
          let rawRates = {};
          const sr = product.shipping_state_rates;
          if (typeof sr === "string") {
            try {
              rawRates = JSON.parse(sr);
            } catch {
              rawRates = {};
            }
          } else if (sr && typeof sr === "object") {
            rawRates = sr;
          }
          const rateEntries = Object.entries(rawRates).filter(([k]) => k);
          setShippingStateRows(
            rateEntries.length
              ? rateEntries.map(([state, fee]) => ({
                  state,
                  fee: String(fee ?? ""),
                }))
              : [{ state: "", fee: "" }],
          );
        };

        try {
          const ship = await getProductShippingApi(editId);
          if (ship) {
            setShippingMode(ship.shipping_mode || "free");
            setShippingFlatFee(
              ship.shipping_flat_fee != null && ship.shipping_flat_fee !== ""
                ? String(ship.shipping_flat_fee)
                : "",
            );
            const rates = ship.shipping_state_rates || {};
            const rateEntries = Object.entries(
              typeof rates === "object" && rates !== null ? rates : {},
            ).filter(([k]) => k);
            setShippingStateRows(
              rateEntries.length
                ? rateEntries.map(([state, fee]) => ({
                    state,
                    fee: String(fee ?? ""),
                  }))
                : [{ state: "", fee: "" }],
            );
          } else {
            applyShippingFromProduct();
          }
        } catch {
          applyShippingFromProduct();
        }
      }
    };

    fetchData();
  }, [editId]);

  useEffect(() => {
    return () => {
      variantDataRef.current.forEach((v) => {
        (v.images || []).forEach((img) => {
          if (
            img.kind === "new" &&
            img.previewUrl &&
            img.previewUrl.startsWith("blob:")
          ) {
            URL.revokeObjectURL(img.previewUrl);
          }
        });
      });
    };
  }, []);

  useEffect(() => {
    if (pendingDeleteVariantIndex == null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setPendingDeleteVariantIndex(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [pendingDeleteVariantIndex]);

  /* ================= HANDLERS ================= */

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const addVariantImages = (variantIndex, e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    setVariantData((prev) => {
      const next = [...prev];
      const row = { ...next[variantIndex] };
      const additions = files.map((file) => ({
        key: newVariantImageKey(),
        kind: "new",
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      row.images = [...(row.images || []), ...additions];
      next[variantIndex] = row;
      return next;
    });
  };

  const removeVariantImage = (variantIndex, imageKey) => {
    setVariantData((prev) => {
      const next = [...prev];
      const row = { ...next[variantIndex] };
      const imgs = [...(row.images || [])];
      const item = imgs.find((x) => x.key === imageKey);
      if (item?.kind === "new" && item.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
      row.images = imgs.filter((x) => x.key !== imageKey);
      next[variantIndex] = row;
      return next;
    });
  };

  const addVariantCard = () => {
    const initialAttrs = selectedAttributes
      .map((attrId) => attributes.find((a) => a.id === attrId))
      .filter(Boolean)
      .map((a) => ({ attribute: a.name, value: "" }));

    setVariantData((prev) => [
      ...prev,
      {
        _rowKey: newVariantRowKey(),
        attributes: initialAttrs.length ? initialAttrs : [{ attribute: "", value: "" }],
        price: "",
        stock: "",
        old_price: "",
        short_description: "",
        is_hidden: false,
        specifications_heading: "",
        specTable: [["", ""]],
        images: [],
      },
    ]);
  };

  const cancelDeleteVariantModal = () => {
    setPendingDeleteVariantIndex(null);
  };

  const runRemoveVariantAtIndex = async (variantIndex) => {
    const row = variantDataRef.current[variantIndex];
    const productId = editId;
    const variantId = row?.id;
    if (
      productId &&
      variantId != null &&
      variantId !== ""
    ) {
      setVariantDeleteInFlight(true);
      try {
        await deleteProductVariantApi(variantId, productId);
        toast.success("Variant deleted");
      } catch (err) {
        console.error(err);
        toast.error(
          err?.response?.data?.message ??
            err?.message ??
            "Failed to delete variant on server",
        );
        return;
      } finally {
        setVariantDeleteInFlight(false);
      }
    } else {
      toast.success("Variant removed");
    }

    setVariantData((prev) => {
      const removed = prev[variantIndex];
      if (removed?.images) {
        removed.images.forEach((img) => {
          if (img.kind === "new" && img.previewUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(img.previewUrl);
          }
        });
      }
      return prev.filter((_, i) => i !== variantIndex);
    });
  };

  const confirmDeleteVariant = async () => {
    const idx = pendingDeleteVariantIndex;
    if (idx == null) return;
    setPendingDeleteVariantIndex(null);
    await runRemoveVariantAtIndex(idx);
  };

  const addVariantAttributeRow = (variantIndex) => {
    setVariantData((prev) => {
      const next = [...prev];
      const row = { ...next[variantIndex] };
      row.attributes = [...(row.attributes || []), { attribute: "", value: "" }];
      next[variantIndex] = row;
      return next;
    });
  };

  const removeVariantAttributeRow = (variantIndex, attrIndex) => {
    setVariantData((prev) => {
      const next = [...prev];
      const row = { ...next[variantIndex] };
      const attrs = [...(row.attributes || [])];
      if (attrs.length <= 1) return prev;
      row.attributes = attrs.filter((_, i) => i !== attrIndex);
      next[variantIndex] = row;
      return next;
    });
  };

  const updateVariantAttributeCell = (variantIndex, attrIndex, key, value) => {
    setVariantData((prev) => {
      const next = [...prev];
      const row = { ...next[variantIndex] };
      const attrs = [...(row.attributes || [])];
      if (!attrs[attrIndex]) return prev;
      attrs[attrIndex] = { ...attrs[attrIndex], [key]: value };
      row.attributes = attrs;
      next[variantIndex] = row;
      return next;
    });
  };

  const handleAttributeSelect = (attrId, checked) => {
    if (checked) {
      setSelectedAttributes((prev) => [...prev, attrId]);
    } else {
      setSelectedAttributes((prev) => prev.filter((id) => id !== attrId));
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];

    if (file) {
      setForm({ ...form, image: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  /* ----- per-variant spec table ----- */
  const handleVariantSpecCell = (variantIndex, rowIndex, colIndex, value) => {
    setVariantData((prev) => {
      const next = [...prev];
      const row = { ...next[variantIndex] };
      const table = (row.specTable || [["", ""]]).map((r) => [...r]);
      if (!table[rowIndex]) return prev;
      table[rowIndex] = [...table[rowIndex]];
      table[rowIndex][colIndex] = value;
      row.specTable = table;
      next[variantIndex] = row;
      return next;
    });
  };

  const addVariantSpecRow = (variantIndex) => {
    setVariantData((prev) => {
      const next = [...prev];
      const row = { ...next[variantIndex] };
      const cols = (row.specTable?.[0]?.length ?? 2) || 2;
      row.specTable = [...(row.specTable || [["", ""]]), Array(cols).fill("")];
      next[variantIndex] = row;
      return next;
    });
  };

  const addVariantSpecColumn = (variantIndex) => {
    setVariantData((prev) => {
      const next = [...prev];
      const row = { ...next[variantIndex] };
      row.specTable = (row.specTable || [["", ""]]).map((r) => [...r, ""]);
      next[variantIndex] = row;
      return next;
    });
  };

  const deleteVariantSpecRow = (variantIndex, rowIndex) => {
    setVariantData((prev) => {
      const next = [...prev];
      const row = { ...next[variantIndex] };
      const t = [...(row.specTable || [["", ""]])];
      if (t.length <= 1) return prev;
      row.specTable = t.filter((_, i) => i !== rowIndex);
      next[variantIndex] = row;
      return next;
    });
  };

  const deleteVariantSpecColumn = (variantIndex, colIndex) => {
    setVariantData((prev) => {
      const next = [...prev];
      const row = { ...next[variantIndex] };
      const t = (row.specTable || [["", ""]]).map((r) => [...r]);
      if (!t[0] || t[0].length <= 1) return prev;
      row.specTable = t.map((r) => r.filter((_, j) => j !== colIndex));
      next[variantIndex] = row;
      return next;
    });
  };

  const openBulkSpecModal = (variantIndex) => {
    setBulkSpecVariantIndex(variantIndex);
    setBulkSpecText("");
  };

  const closeBulkSpecModal = () => {
    setBulkSpecVariantIndex(null);
    setBulkSpecText("");
  };

  const applyBulkSpecifications = () => {
    if (bulkSpecVariantIndex == null) return;
    const rows = parseSpecificationsBulkText(bulkSpecText);
    if (rows.length === 0) {
      toast.error(
        'No rows parsed. Use one "Key : Value" per line (first colon splits key and value).',
      );
      return;
    }
    setVariantData((prev) => {
      const next = [...prev];
      const row = { ...next[bulkSpecVariantIndex] };
      row.specTable = rows;
      next[bulkSpecVariantIndex] = row;
      return next;
    });
    toast.success(`Specifications: ${rows.length} rows applied`);
    closeBulkSpecModal();
  };

  /* ================= VALIDATE ================= */

  const validate = () => {
    const newErrors = {};

    if (!form.name) newErrors.name = "Product name required";
    if (!form.category_id) newErrors.category_id = "Category required";
    if (!variantData.length) {
      newErrors.variants = "Generate at least one variant and set prices";
    } else {
      const missingPrice = variantData.some(
        (v) => !String(v.price ?? "").trim(),
      );
      if (missingPrice) {
        newErrors.variants = "Each variant needs a selling price";
      }
    }

    if (shippingMode === "by_state") {
      const filled = shippingStateRows.filter(
        (r) =>
          r.state &&
          String(r.fee).trim() !== "" &&
          !Number.isNaN(Number(r.fee)),
      );
      if (filled.length === 0) {
        newErrors.shipping =
          "Add at least one state with a shipping fee (use 0 for free delivery to that state)";
      } else {
        const states = filled.map((r) => r.state);
        if (new Set(states).size !== states.length) {
          newErrors.shipping = "Remove duplicate states in shipping rows";
        }
      }
    }

    setErrors(newErrors);
    return newErrors;
  };

  const existingImagePayload = (img) => {
    if (img.storedName) return img.storedName;
    const url = img.previewUrl || "";
    if (typeof url !== "string") return "";
    const i = url.indexOf("/uploads/");
    if (i >= 0) return decodeURIComponent(url.slice(i + "/uploads/".length));
    return "";
  };


  const getImagesForVariant = (variantIndex) => {
    if (useSameVariantImages && variantIndex > 0) {
      return variantData[0]?.images || [];
    }
    return variantData[variantIndex]?.images || [];
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {
    const validationErrors = validate();
    const errKeys = Object.keys(validationErrors);
    if (errKeys.length > 0) {
      // toast.error(
      //   Object.values(validationErrors).join("\n") +
      //     "\n\nNo API request is sent until these are fixed.",
      // );
      return;
    }

    try {
      setLoading(true);

      const fd = new FormData();

      fd.append("category_id", form.category_id);
      fd.append("brand_id", form.brand_id || "");
      fd.append("name", form.name);
      fd.append("slug", form.slug.trim());
      fd.append("meta_title", form.meta_title.trim());
      fd.append("meta_description", form.meta_description.trim());
      fd.append("sku", form.sku || "");
      fd.append("hsn", form.hsn || "");
      fd.append("fsn", form.fsn || "");
      fd.append("is_cod", form.is_cod);
      fd.append("in_stock", form.in_stock);

      if (form.image) {
        fd.append("image", form.image);
      }

      let productId;

      if (editId) {
        await updateProductApi(editId, fd);
        productId = editId;
      } else {
        const res = await createProductApi(fd);
        productId = res.data.id;
      }

      const seenAttr = new Set();
      const formatted = [];
      for (const v of variantData) {
        for (const pair of v.attributes || []) {
          const attrName = String(pair?.attribute ?? "").trim().toLowerCase();
          const rawVal = String(pair?.value ?? "").trim();
          if (!attrName || !rawVal) continue;
          const attr = attributes.find(
            (a) => String(a.name ?? "").trim().toLowerCase() === attrName,
          );
          if (!attr) continue;
          const valueMatch = (attr.AttributeValues || []).find((av) =>
            expandCommaSeparatedAttributeValues(av.value).some(
              (p) => p.toLowerCase() === rawVal.toLowerCase(),
            ),
          );
          if (!valueMatch?.id) continue;
          const k = `${attr.id}-${valueMatch.id}`;
          if (seenAttr.has(k)) continue;
          seenAttr.add(k);
          formatted.push({
            attribute_id: attr.id,
            attribute_value_id: valueMatch.id,
          });
        }
      }

      await assignProductAttributesApi({
        product_id: productId,
        attributes: formatted,
      });

      const fdVariants = new FormData();
      fdVariants.append("product_id", productId);

      const attrsToObject = (attrList) => {
        const o = {};
        (attrList || []).forEach((a) => {
          const key = a.attribute ?? a.name;
          if (key) o[key] = a.value ?? "";
        });
        return o;
      };

      fdVariants.append(
        "variants",
        JSON.stringify(
          variantData.map((v) => {
           const imagesForThisVariant =
            useSameVariantImages && variantData[0]
              ? variantData[0].images || []
              : v.images || [];
          const existingList = imagesForThisVariant
            .filter((img) => img.kind === "existing")
            .map((img) => existingImagePayload(img))
            .filter(Boolean);

            const heading = v.specifications_heading ?? "";
            const attrSignature = buildVariantAttributeSignature(v.attributes);
            const specRowsWithHiddenMarker = withVariantHiddenMarker(
              v.specTable ?? [["", ""]],
              !!v.is_hidden,
              attrSignature,
            );
            return {
              attributes: attrsToObject(v.attributes),
              price: v.price,
              stock: v.stock,
              old_price: v.old_price ?? "",
              is_hidden: v.is_hidden ? 1 : 0,
              isHidden: v.is_hidden ? 1 : 0,
              hidden: v.is_hidden ? 1 : 0,
              visible: v.is_hidden ? 0 : 1,
              visibility: v.is_hidden ? "hidden" : "visible",
              status: v.is_hidden ? "inactive" : "active",
              short_description: v.short_description ?? "",
              specifications_heading: heading,
              /** camelCase — kuch backends / Sequelize isi naam se save karte hain */
              specificationsHeading: heading,
              /**
               * Send spec table in multiple aliases so backend keeps structured rows
               * (prevents legacy "items" merge when values contain commas).
               */
              specifications: specRowsWithHiddenMarker,
              specTable: specRowsWithHiddenMarker,
              specifications_table: specRowsWithHiddenMarker,
              existing_images: existingList,
            };
          }),
        ),
      );

      variantData.forEach((v, i) => {
  const imagesForThisVariant =
    useSameVariantImages && variantData[0]
      ? variantData[0].images || []
      : v.images || [];
  imagesForThisVariant.forEach((img) => {
    if (img.kind === "new" && img.file) {
      fdVariants.append(`variant_images_${i}`, img.file);
    }
  });
});
      await saveProductVariantsApi(fdVariants);

      const shippingStateRates = {};
      if (shippingMode === "by_state") {
        shippingStateRows.forEach((r) => {
          if (
            r.state &&
            String(r.fee).trim() !== "" &&
            !Number.isNaN(Number(r.fee))
          ) {
            shippingStateRates[r.state] = Math.max(0, Number(r.fee) || 0);
          }
        });
      }

      try {
        await putProductShippingApi(productId, {
          shipping_mode: shippingMode,
          shipping_flat_fee:
            shippingMode === "flat" ? Number(shippingFlatFee) || 0 : 0,
          shipping_state_rates:
            shippingMode === "by_state" ? shippingStateRates : {},
        });
      } catch (shipErr) {
        console.error(shipErr);
        toast.warning(
          "Product saved, but shipping could not be saved. Check network or shipping API.",
        );
        router.push("/admin/products");
        return;
      }

      router.push("/admin/products");
    } catch (err) {
      console.error(err);
      const message = err?.response?.data?.message ?? err?.message ?? "Save failed";
      if (/slug/i.test(message)) {
        setErrors((prev) => ({ ...prev, slug: message }));
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="text-white">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold">
            {editId ? "Edit Product" : "Add Product"}
          </h2>
          <p className="text-sm text-gray-400">
            Common details here; pricing, images & descriptions are per variant
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] px-6 py-2 rounded-lg text-sm font-medium"
        >
          {loading ? "Saving..." : "Save Product"}
        </button>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#111827] p-6 rounded-xl">
              <h3 className="mb-4 font-semibold">Basic Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <input
                  name="name"
                  value={form.name}
                  placeholder="Product Name"
                  onChange={handleChange}
                  className="bg-[#0B0F19] border border-gray-700 p-2 rounded col-span-2"
                />

                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={async (e) => {
                    const categoryId = e.target.value;
                    setForm((prev) => ({ ...prev, category_id: categoryId }));
                    if (categoryId) {
                      try {
                        const [res, cat] = await Promise.all([
                          getCategoryAttributesFullApi(categoryId),
                          getCategoryByIdApi(categoryId),
                        ]);
                        setAttributes(res);
                        const catHsn =
                          cat?.hsn != null && String(cat.hsn).trim() !== ""
                            ? String(cat.hsn).trim()
                            : "";
                        setForm((prev) => ({
                          ...prev,
                          category_id: categoryId,
                          hsn: catHsn,
                        }));
                      } catch {
                        setAttributes([]);
                      }
                    } else {
                      setAttributes([]);
                    }
                  }}
                  className="bg-[#0B0F19] border border-gray-700 p-2 rounded"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  name="brand_id"
                  value={form.brand_id}
                  onChange={handleChange}
                  className="bg-[#0B0F19] border border-gray-700 p-2 rounded"
                >
                  <option value="">Select Brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <input
                  name="sku"
                  value={form.sku}
                  placeholder="SKU (product)"
                  onChange={handleChange}
                  className="bg-[#0B0F19] border border-gray-700 p-2 rounded"
                />
           <input
                  name="fsn"
                  value={form.fsn}
                  placeholder="FSN"
                  onChange={handleChange}
                  className="bg-[#0B0F19] border border-gray-700 p-2 rounded"
                />

                <input
                  name="hsn"
                  value={form.hsn}
                  placeholder="HSN (from category)"
                  onChange={handleChange}
                  className="bg-[#0B0F19] border border-gray-700 p-2 rounded"
                />
                <p className="col-span-2 text-xs text-gray-500">
                  HSN fills from the selected category; you can edit it. Saving the category
                  with an HSN also syncs that value to all products in that category.
                </p>
              </div>
              {errors.name && (
                <p className="text-red-400 text-xs mt-2">{errors.name}</p>
              )}
              {errors.category_id && (
                <p className="text-red-400 text-xs mt-2">{errors.category_id}</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-xl bg-[#111827] p-6">
              <h3 className="mb-4 font-semibold">Product Image</h3>

              <input
                type="file"
                onChange={handleFile}
                className="w-full rounded border border-gray-700 bg-[#0B0F19] p-2"
              />

              {preview && (
                <img
                  src={preview}
                  alt=""
                  className="mt-4 h-40 w-full rounded bg-white object-contain p-2"
                />
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-[#111827] p-6">
          <h3 className="mb-4 font-semibold">SEO</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <input
                name="slug"
                value={form.slug}
                placeholder="Custom Slug (optional)"
                onChange={handleChange}
                className="w-full bg-[#0B0F19] border border-gray-700 p-2 rounded"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave blank to auto-generate from the product name, e.g.
                “apple-iphone-16-pro-max”.
              </p>
              {errors.slug && (
                <p className="text-red-400 text-xs mt-1">{errors.slug}</p>
              )}
            </div>

            <div>
              <input
                name="meta_title"
                value={form.meta_title}
                placeholder="Meta Title (optional)"
                onChange={handleChange}
                className="w-full bg-[#0B0F19] border border-gray-700 p-2 rounded"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave blank to use the product name.
              </p>
            </div>

            <div className="sm:col-span-2">
              <textarea
                name="meta_description"
                value={form.meta_description}
                placeholder="Meta Description (optional)"
                onChange={handleChange}
                rows={3}
                className="w-full bg-[#0B0F19] border border-gray-700 p-2 rounded"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave blank to auto-generate from the product description
                (first ~160 characters).
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-[#111827] p-4 sm:p-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-100">Settings</h3>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 sm:gap-x-12">
            <label className="flex cursor-pointer items-center gap-2.5 text-gray-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-600"
                checked={form.is_cod === 1}
                onChange={(e) =>
                  setForm({ ...form, is_cod: e.target.checked ? 1 : 0 })
                }
              />
              <span className="text-sm">COD available</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2.5 text-gray-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-600"
                checked={form.in_stock === 1}
                onChange={(e) =>
                  setForm({ ...form, in_stock: e.target.checked ? 1 : 0 })
                }
              />
              <span className="text-sm">In stock</span>
            </label>
          </div>

          <div className="mt-4 space-y-3 border-t border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-300">Shipping</h4>
            <p className="text-xs text-gray-500">
              Free, one flat fee for all of India, or a fee per state.
            </p>
                <select
                  value={shippingMode}
                  onChange={(e) => setShippingMode(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
                >
                  <option value="free">Free shipping</option>
                  <option value="flat">Flat shipping fee (all India)</option>
                  <option value="by_state">Shipping fee by state</option>
                </select>

                {shippingMode === "flat" && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Fee (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shippingFlatFee}
                      onChange={(e) => setShippingFlatFee(e.target.value)}
                      placeholder="0"
                      className="w-full bg-[#0B0F19] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>
                )}

                {shippingMode === "by_state" && (
                  <div className="space-y-2 pt-1">
                    {shippingStateRows.map((row, i) => {
                      const taken = new Set(
                        shippingStateRows
                          .map((r, j) => (j !== i ? r.state : null))
                          .filter(Boolean),
                      );
                      const options = INDIAN_STATES.filter((s) => !taken.has(s));
                      return (
                        <div
                          key={`ship-row-${i}`}
                          className="flex flex-wrap gap-2 items-end"
                        >
                          <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs text-gray-500 mb-1">
                              State / UT
                            </label>
                            <select
                              value={row.state}
                              onChange={(e) => {
                                const next = [...shippingStateRows];
                                next[i] = { ...next[i], state: e.target.value };
                                setShippingStateRows(next);
                              }}
                              className="w-full bg-[#0B0F19] border border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-200"
                            >
                              <option value="">Select</option>
                              {row.state &&
                                !INDIAN_STATES.includes(row.state) && (
                                  <option value={row.state}>{row.state}</option>
                                )}
                              {options.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-28">
                            <label className="block text-xs text-gray-500 mb-1">
                              Fee (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.fee}
                              onChange={(e) => {
                                const next = [...shippingStateRows];
                                next[i] = { ...next[i], fee: e.target.value };
                                setShippingStateRows(next);
                              }}
                              placeholder="0"
                              className="w-full bg-[#0B0F19] border border-gray-700 rounded-lg px-2 py-2 text-sm text-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (shippingStateRows.length <= 1) return;
                              setShippingStateRows(
                                shippingStateRows.filter((_, j) => j !== i),
                              );
                            }}
                            className="text-xs text-red-400 hover:text-red-300 px-2 py-2"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() =>
                        setShippingStateRows([
                          ...shippingStateRows,
                          { state: "", fee: "" },
                        ])
                      }
                      className="text-xs text-[#00C2A8] hover:underline"
                    >
                      + Add state
                    </button>
                  </div>
                )}

            {errors.shipping && (
              <p className="text-xs text-red-400">{errors.shipping}</p>
            )}
          </div>
        </div>

        <section className="rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-[#0f172a] to-[#0b0f19] shadow-lg shadow-black/40 overflow-hidden">
          <div className="p-6 space-y-8">
            {errors.variants && (
              <p className="text-red-400 text-sm">{errors.variants}</p>
            )}

            {attributes.length > 0 && variantData.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#00C2A8]/30 bg-[#00C2A8]/[0.04] p-4">
                <button
                  type="button"
                  onClick={addVariantCard}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#00C2A8]/40 bg-[#00C2A8]/10 px-3 py-2 text-sm font-medium text-[#5eead4] hover:bg-[#00C2A8]/20"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.25} />
                  Add first variant
                </button>
              </div>
            )}

            {variantData.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Step 2 - Per variant
                  </p>
                      {variantData.length > 1 && (
                            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-gray-300">
                              <input
                                type="checkbox"
                                checked={useSameVariantImages}
                                onChange={(e) => setUseSameVariantImages(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-600"
                              />
                              <span>Use same images for all variants</span>
                            </label>
                          )}


                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600">
                      {variantData.length} row{variantData.length !== 1 ? "s" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={addVariantCard}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#00C2A8]/40 bg-[#00C2A8]/10 px-2.5 py-1.5 text-xs font-medium text-[#5eead4] hover:bg-[#00C2A8]/20"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                      Add variant
                    </button>
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {variantData.map((v, i) => {
                      const specTable = v.specTable || [["", ""]];
                      const imagesToShow =
                        useSameVariantImages && i > 0
                          ? variantData[0]?.images || []
                          : v.images || [];
                      const isSharedImageVariant = useSameVariantImages && i > 0;

                    return (
                      <div
                        key={v._rowKey ?? `variant-${i}`}
                        className="group rounded-xl border border-gray-800 bg-[#0B0F19] p-5 shadow-inner transition hover:border-gray-700"
                      >
                        <div className="mb-4 flex items-start justify-between gap-2 border-b border-gray-800 pb-3">
                          <div className="min-w-0 font-semibold text-sm leading-snug text-amber-300/95">
                            {getVariantCardHeading(v, i)}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-700 bg-[#111827] px-2 py-1 text-[10px] font-medium text-gray-300">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-gray-600"
                                checked={!v.is_hidden}
                                onChange={(e) => {
                                  const updated = [...variantData];
                                  updated[i].is_hidden = e.target.checked ? false : true;
                                  setVariantData(updated);
                                }}
                              />
                              {v.is_hidden ? "Hidden" : "Visible"}
                            </label>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteVariantIndex(i)}
                              disabled={variantDeleteInFlight}
                              className="rounded-md p-1.5 text-gray-500 transition hover:bg-red-500/15 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:pointer-events-none disabled:opacity-40"
                              title="Delete variant"
                              aria-label="Delete variant"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={2} />
                            </button>
                            <span className="rounded bg-gray-800/80 px-2 py-0.5 text-[10px] font-mono text-gray-500">
                              #{i + 1}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">
                             Selling Price (₹)
                            </label>
                            <input
                              placeholder="0"
                              value={v.price}
                              onChange={(e) => {
                                const updated = [...variantData];
                                updated[i].price = e.target.value;
                                setVariantData(updated);
                              }}
                              className="w-full rounded-lg border border-gray-700 bg-[#111827] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-[#00C2A8]/50 focus:outline-none focus:ring-1 focus:ring-[#00C2A8]/30"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">
                              MRP
                            </label>
                            <input
                              placeholder="Optional"
                              value={v.old_price ?? ""}
                              onChange={(e) => {
                                const updated = [...variantData];
                                updated[i].old_price = e.target.value;
                                setVariantData(updated);
                              }}
                              className="w-full rounded-lg border border-gray-700 bg-[#111827] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-[#00C2A8]/50 focus:outline-none focus:ring-1 focus:ring-[#00C2A8]/30"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">
                              Stock
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={
                                v.stock === "" || v.stock == null ? "" : v.stock
                              }
                              onChange={(e) => {
                                const raw = e.target.value;
                                const updated = [...variantData];
                                if (raw === "") {
                                  updated[i].stock = "";
                                } else {
                                  const n = Math.max(0, parseInt(raw, 10) || 0);
                                  updated[i].stock = String(n);
                                }
                                setVariantData(updated);
                              }}
                              className="w-full rounded-lg border border-gray-700 bg-[#111827] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-[#00C2A8]/50 focus:outline-none focus:ring-1 focus:ring-[#00C2A8]/30"
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between">
                            <label className="block text-[10px] uppercase tracking-wide text-gray-500">
                              Attributes (this variant)
                            </label>
                            <button
                              type="button"
                              onClick={() => addVariantAttributeRow(i)}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-700 bg-[#111827] px-2 py-1 text-[11px] text-gray-300 hover:border-[#00C2A8]/40 hover:text-[#5eead4]"
                            >
                              <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                              Add
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(v.attributes || []).map((attrRow, attrIndex) => (
                              <div
                                key={`var-${i}-attr-${attrIndex}`}
                                className="grid grid-cols-12 gap-2"
                              >
                                <select
                                  value={attrRow.attribute ?? ""}
                                  onChange={(e) =>
                                    updateVariantAttributeCell(
                                      i,
                                      attrIndex,
                                      "attribute",
                                      e.target.value,
                                    )
                                  }
                                  className="col-span-5 rounded-lg border border-gray-700 bg-[#111827] px-2 py-2 text-xs text-white"
                                >
                                  <option value="">Select attribute</option>
                                  {attributes.map((a) => (
                                    <option key={a.id} value={a.name}>
                                      {a.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  value={attrRow.value ?? ""}
                                  onChange={(e) =>
                                    updateVariantAttributeCell(
                                      i,
                                      attrIndex,
                                      "value",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Attribute value"
                                  className="col-span-6 rounded-lg border border-gray-700 bg-[#111827] px-2 py-2 text-xs text-white placeholder:text-gray-600"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeVariantAttributeRow(i, attrIndex)
                                  }
                                  disabled={(v.attributes || []).length <= 1}
                                  className="col-span-1 inline-flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-30"
                                  title="Remove attribute row"
                                >
                                  <X size={14} strokeWidth={2.5} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3">
                        <label className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">
                           Heading
                          </label>
                          <input
                            type="text"
                            placeholder="Produst Heading"
                            value={v.specifications_heading ?? ""}
                            onChange={(e) => {
                              const updated = [...variantData];
                              updated[i].specifications_heading = e.target.value;
                              setVariantData(updated);
                            }}
                            className="mb-3 w-full rounded-lg border border-gray-700 bg-[#111827] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-[#00C2A8]/50 focus:outline-none focus:ring-1 focus:ring-[#00C2A8]/30"
                          />
                          <label className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">
                            Short description
                          </label>
                          <div className="overflow-hidden rounded-lg border border-gray-700">
                            <JoditEditor
                              value={v.short_description ?? ""}
                              config={joditConfig}
                              onBlur={(newContent) => {
                                const updated = [...variantData];
                                updated[i].short_description = newContent;
                                setVariantData(updated);
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-4">

                          <label className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-gray-500">
                            <span>Specifications (this variant)</span>
                            <button
                              type="button"
                              onClick={() => openBulkSpecModal(i)}
                              className="inline-flex items-center gap-1 rounded-md border border-[#00C2A8]/40 bg-[#00C2A8]/10 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-[#7ee8dc] hover:bg-[#00C2A8]/20"
                              title="Paste many lines: Key : Value"
                            >
                              <Plus size={12} strokeWidth={2.5} />
                              Bulk paste
                            </button>
                          </label>
                          <div className="border border-gray-700 rounded overflow-x-auto">
                            <table className="w-full text-sm min-w-[280px]">
                              <tbody>
                                <tr className="border-b border-gray-800 bg-[#0B0F19]/60">
                                  {(specTable[0] || []).map((_, colIndex) => (
                                    <td
                                      key={`col-h-${i}-${colIndex}`}
                                      className="p-1 align-middle"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          deleteVariantSpecColumn(i, colIndex)
                                        }
                                        disabled={(specTable[0]?.length ?? 0) <= 1}
                                        title="Remove this column"
                                        className="mx-auto flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-25"
                                      >
                                        <X size={16} strokeWidth={2.5} />
                                      </button>
                                    </td>
                                  ))}
                                  <td className="w-12 p-1 text-center text-[10px] uppercase tracking-wide text-gray-500">
                                    Row
                                  </td>
                                </tr>
                                {specTable.map((row, rowIndex) => (
                                  <tr
                                    key={`${i}-r-${rowIndex}`}
                                    className="border-b border-gray-800"
                                  >
                                    {row.map((cell, colIndex) => (
                                      <td key={colIndex} className="p-2">
                                        <input
                                          type="text"
                                          value={cell}
                                          onChange={(e) =>
                                            handleVariantSpecCell(
                                              i,
                                              rowIndex,
                                              colIndex,
                                              e.target.value,
                                            )
                                          }
                                          className="w-full bg-[#0B0F19] border border-gray-700 p-1 rounded"
                                        />
                                      </td>
                                    ))}

                                    <td className="text-center align-middle">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          deleteVariantSpecRow(i, rowIndex)
                                        }
                                        disabled={specTable.length <= 1}
                                        title="Remove this row"
                                        className="inline-flex h-8 w-8 items-center justify-center rounded text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-25"
                                      >
                                        <X size={16} strokeWidth={2.5} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            <div className="flex gap-2 p-2">
                              <button
                                type="button"
                                onClick={() => addVariantSpecRow(i)}
                                className="bg-[#1F2937] px-3 py-1 rounded text-sm"
                              >
                                + Row
                              </button>
                              <button
                                type="button"
                                onClick={() => addVariantSpecColumn(i)}
                                className="bg-[#1F2937] px-3 py-1 rounded text-sm"
                              >
                                + Column
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <label className="mb-1 block text-[10px] uppercase tracking-wide text-gray-500">
                            Gallery (this variant)
                          </label>
                          <p className="text-xs text-gray-500 mb-2">
                            Multiple images — each pick adds to this variant.
                            Remove with ✕ on thumbnails.
                          </p>
                          <input
                              type="file"
                              accept="image/*"
                              multiple
                              disabled={isSharedImageVariant}
                              onChange={(e) => addVariantImages(i, e)}
                            className="w-full cursor-pointer rounded-lg border border-dashed border-gray-600 bg-[#111827]/50 px-3 py-2 text-xs file:mr-3 file:rounded file:border-0 file:bg-[#1F2937] file:px-2 file:py-1 file:text-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                          <div className="mt-2 flex flex-wrap gap-2">
                            {imagesToShow.map((img) => (

                              <div
                                key={img.key}
                                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-600 bg-white"
                              >
                                <img
                                  src={img.previewUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              <button
                                  type="button"
                                  disabled={isSharedImageVariant}
                                  onClick={() => removeVariantImage(i, img.key)}

                                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-red-600"
                                  title="Remove"
                                  aria-label="Remove image"
                                >
                                  <X size={12} strokeWidth={2.5} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {bulkSpecVariantIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-spec-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close bulk paste"
            onClick={closeBulkSpecModal}
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-gray-700/90 bg-[#0f172a] shadow-2xl ring-1 ring-white/10">
            <div className="border-b border-gray-800 px-5 py-4">
              <h3
                id="bulk-spec-title"
                className="text-lg font-semibold text-white"
              >
                Bulk paste specifications
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                One line per row: <span className="text-gray-300">Key : Value</span>{" "}
                (only the first <code className="text-[#7ee8dc]">:</code> on a line splits
                key and value). Lines without{" "}
                <code className="text-[#7ee8dc]">:</code> attach to the previous value.
                Applying replaces the spec table for this variant with two columns (key,
                value).
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-5 py-3">
              <textarea
                value={bulkSpecText}
                onChange={(e) => setBulkSpecText(e.target.value)}
                rows={18}
                placeholder={`Brand : Sound Boss\nVehicle Brand : Universal For Car\nType : Audio`}
                className="h-[min(50vh,420px)] w-full resize-y rounded-lg border border-gray-700 bg-[#111827] px-3 py-2 font-mono text-sm text-white placeholder:text-gray-600 focus:border-[#00C2A8]/50 focus:outline-none focus:ring-1 focus:ring-[#00C2A8]/30"
                spellCheck={false}
              />
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-gray-800 px-5 py-4 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={closeBulkSpecModal}
                className="rounded-xl border border-gray-600 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-gray-800/80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyBulkSpecifications}
                className="rounded-xl bg-gradient-to-r from-[#00C2A8] to-[#00A8FF] px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-95"
              >
                Apply to table
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteVariantIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="variant-delete-title"
          aria-describedby="variant-delete-desc"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close dialog"
            onClick={cancelDeleteVariantModal}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-700/90 bg-[#0f172a] p-6 shadow-2xl shadow-black/50 ring-1 ring-white/10">
            <h3
              id="variant-delete-title"
              className="text-lg font-semibold text-white"
            >
              Remove this variant?
            </h3>
            <p
              id="variant-delete-desc"
              className="mt-2 text-sm leading-relaxed text-gray-400"
            >
              Unsaved changes on this variant will be lost. This cannot be
              undone from the form.
            </p>
            {variantData[pendingDeleteVariantIndex] ? (
              <p className="mt-3 rounded-lg border border-gray-800 bg-[#111827] px-3 py-2 text-sm text-amber-300/95">
                {getVariantCardHeading(
                  variantData[pendingDeleteVariantIndex],
                  pendingDeleteVariantIndex,
                )}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={cancelDeleteVariantModal}
                disabled={variantDeleteInFlight}
                className="rounded-xl border border-gray-600 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-gray-800/80 disabled:opacity-50"
              >
                No, keep it
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteVariant()}
                disabled={variantDeleteInFlight}
                className="rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition hover:from-red-500 hover:to-red-600 disabled:opacity-50"
              >
                {variantDeleteInFlight ? "Removing…" : "Yes, remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductForm;
