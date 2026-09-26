import Product from "@/lib/models/productModel.js";
import ProductShippingRate from "@/lib/models/productShippingRateModel.js";

const MODES = new Set(["free", "flat", "by_state"]);

function normalizeMode(raw) {
  const s = String(raw ?? "free").trim().toLowerCase();
  return MODES.has(s) ? s : "free";
}

/** Multer / proxies sometimes give the last value or an array of strings. */
function pickBodyField(body, key) {
  if (!body || !Object.prototype.hasOwnProperty.call(body, key)) {
    return { present: false, value: undefined };
  }
  let v = body[key];
  if (Array.isArray(v)) v = v[v.length - 1];
  return { present: true, value: v };
}

/** Parse shipping_state_rates from multipart / JSON body. */
export function parseShippingStateRates(body) {
  const { value: raw } = pickBodyField(body, "shipping_state_rates");
  if (raw == null || raw === "") return {};
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return { ...raw };
  }
  if (Array.isArray(raw)) {
    const o = {};
    raw.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const s = item.state ?? item.state_name ?? item.name ?? item.key;
      const f = item.fee ?? item.amount ?? item.price;
      const name = String(s ?? "").trim();
      if (!name) return;
      const n = Number(f);
      if (!Number.isFinite(n)) return;
      o[name] = Math.max(0, n);
    });
    return o;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "{}") return {};
    try {
      const o = JSON.parse(trimmed);
      if (Array.isArray(o)) {
        return parseShippingStateRates({ shipping_state_rates: o });
      }
      return typeof o === "object" && o !== null ? o : {};
    } catch {
      return {};
    }
  }
  return {};
}

export async function getShippingStateRatesObject(productId) {
  const rows = await ProductShippingRate.findAll({
    where: { product_id: productId },
    attributes: ["state_name", "fee"],
  });
  const o = {};
  rows.forEach((r) => {
    const j = typeof r.toJSON === "function" ? r.toJSON() : r;
    o[j.state_name] = Number(j.fee);
  });
  return o;
}

/**
 * Persists mode + flat fee on Product and replaces per-state rows when mode is by_state.
 * @param {number} productId
 * @param {object} body - request body fields as strings
 */
export async function syncProductShipping(productId, body) {
  const modeField = pickBodyField(body, "shipping_mode");
  const mode = normalizeMode(modeField.present ? modeField.value : body?.shipping_mode);

  const flatField = pickBodyField(body, "shipping_flat_fee");
  const flatRaw = Number(flatField.present ? flatField.value : body?.shipping_flat_fee);
  const flatFee = Number.isFinite(flatRaw) ? Math.max(0, flatRaw) : 0;

  const ratesField = pickBodyField(body, "shipping_state_rates");

  await Product.update(
    { shipping_mode: mode, shipping_flat_fee: mode === "flat" ? flatFee : 0 },
    { where: { id: productId } },
  );

  if (mode === "free" || mode === "flat") {
    await ProductShippingRate.destroy({ where: { product_id: productId } });
    return;
  }

  // by_state: agar client ne shipping_state_rates field bheja hi nahi (sirf mode),
  // purani state rows mat todo — warna har product update par rates wipe ho jaate hain.
  if (!ratesField.present) {
    return;
  }

  await ProductShippingRate.destroy({ where: { product_id: productId } });

  const rates = parseShippingStateRates(body);
  const rows = [];
  Object.entries(rates).forEach(([state_name, v]) => {
    const name = String(state_name ?? "").trim();
    if (!name) return;
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    rows.push({ product_id: productId, state_name: name, fee: Math.max(0, n) });
  });

  if (rows.length) {
    await ProductShippingRate.bulkCreate(rows, { validate: true });
  }
}

export { normalizeMode };
