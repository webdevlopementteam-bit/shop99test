/**
 * Normalizes product shipping fields from API (string JSON or object).
 */
export function parseShippingStateRates(product) {
  const raw = product?.shipping_state_rates;
  if (!raw) return {};
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    return { ...raw };
  }
  if (typeof raw === "string") {
    try {
      const o = JSON.parse(raw);
      return typeof o === "object" && o !== null ? o : {};
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * @returns {{ mode: 'free'|'flat'|'by_state', flatFee: number, rates: Record<string, number> }}
 */
export function getProductShipping(product) {
  const mode = product?.shipping_mode || "free";
  const flat = Number(product?.shipping_flat_fee);
  const rates = parseShippingStateRates(product);
  const flatFee = Number.isFinite(flat) ? Math.max(0, flat) : 0;

  if (mode === "flat") {
    return { mode: "flat", flatFee, rates: {} };
  }
  if (mode === "by_state") {
    const normalized = {};
    Object.entries(rates).forEach(([k, v]) => {
      const n = Number(v);
      if (k && Number.isFinite(n)) normalized[k] = Math.max(0, n);
    });
    return { mode: "by_state", flatFee: 0, rates: normalized };
  }
  return { mode: "free", flatFee: 0, rates: {} };
}

export function formatShippingFeeRupees(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return "Free";
  return `₹${amount % 1 === 0 ? amount : amount.toFixed(2)}`;
}
