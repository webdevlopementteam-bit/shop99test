import path from "path";
import { createInvoicePDF, createLabelPDF } from "@/lib/services/pdfService.js";

/**
 * Redirect for PayU's surl/furl POST back to us. Relative on purpose: the
 * browser resolves it against the domain it posted to (test or live site),
 * so it never depends on an env URL that may point at an internal address. 303 turns PayU's POST into a GET of the result page.
 */
export function redirectToPage(pathAndQuery) {
  return new Response(null, { status: 303, headers: { Location: pathAndQuery } });
}


/** Resolves an "/uploads/..." relative URL to its actual file path under public/. */
export function resolveUploadPath(rel) {
  if (!rel) return null;
  return path.join(process.cwd(), "public", String(rel).trim().replace(/^\/+/, ""));
}

export function num(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export function hasBankDetails(payload = {}) {
  return Boolean(String(payload.refund_account_number || "").trim() && String(payload.refund_ifsc || "").trim());
}

export function pickRefundPayload(body = {}) {
  const src = body.refund && typeof body.refund === "object" ? body.refund : body;
  return {
    refund_amount: src.refund_amount ?? src.amount ?? null,
    refund_method: src.refund_method ?? src.method ?? null,
    refund_reason: src.refund_reason ?? src.reason ?? null,
    refund_reference: src.refund_reference ?? src.reference ?? null,
    refund_account_holder: src.refund_account_holder ?? src.account_holder ?? null,
    refund_account_number: src.refund_account_number ?? src.account_number ?? null,
    refund_ifsc: src.refund_ifsc ?? src.ifsc ?? null,
    refund_upi_id: src.refund_upi_id ?? src.upi_id ?? null,
  };
}

export function calculateRefundAmount(order) {
  const qty = num(order.qty, 1);
  const base = qty * num(order.rate);
  return Number((base + num(order.cgst) + num(order.sgst) + num(order.igst)).toFixed(2));
}

const RETURN_REPLACE_WINDOW_DAYS = 7;
export { RETURN_REPLACE_WINDOW_DAYS };

export function getReturnReplaceWindowState(order) {
  const dateCandidates = [order?.delivered_date, order?.deliveredDate, order?.order_date, order?.createdAt];

  const anchorRaw = dateCandidates.find((v) => v != null && String(v).trim() !== "");
  if (!anchorRaw) {
    return { withinWindow: true, daysPassed: 0 };
  }

  const anchorDate = new Date(anchorRaw);
  if (Number.isNaN(anchorDate.getTime())) {
    return { withinWindow: true, daysPassed: 0 };
  }

  const now = new Date();
  const diffMs = now.getTime() - anchorDate.getTime();
  if (diffMs <= 0) {
    return { withinWindow: true, daysPassed: 0 };
  }

  const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return { withinWindow: daysPassed <= RETURN_REPLACE_WINDOW_DAYS, daysPassed };
}

export async function ensureInvoicePdf(orderInstance) {
  const order = orderInstance.get({ plain: true });

  const url = await createInvoicePDF(order);

  await orderInstance.update({ invoice_url: url });
  await orderInstance.reload();

  return resolveUploadPath(url);
}

export async function ensureLabelPdf(orderInstance) {
  const order = orderInstance.get({ plain: true });

  const url = await createLabelPDF(order);

  await orderInstance.update({ shipping_label_url: url });
  await orderInstance.reload();

  return resolveUploadPath(url);
}
