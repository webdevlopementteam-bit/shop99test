/**
 * Order confirmed / delivered SMS via Fast2SMS DLT (route=dlt), same stack as OTP.
 * Env: FAST2SMS_ORDER_CONFIRMED_F2S_MESSAGE_ID, FAST2SMS_ORDER_DELIVERED_F2S_MESSAGE_ID
 *      + shared FAST2SMS_API_KEY, FAST2SMS_ENTITY_ID, FAST2SMS_SENDER_ID, FAST2SMS_SMS_ROUTE=dlt
 */

function normalizeIndianMobile(phone) {
  const d = String(phone ?? "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return d.slice(2);
  if (d.length === 11 && d.startsWith("0")) return d.slice(1);
  if (d.length >= 10) return d.slice(-10);
  return d;
}

function formatNumbersForFast2SMS(digits10) {
  if (process.env.FAST2SMS_NUMBERS_WITH_91 === "1") {
    return `91${digits10}`;
  }
  return digits10;
}

function orderVariableForTemplate(order) {
  const id =
    order?.order_id != null && String(order.order_id).trim() !== "" ? String(order.order_id).trim() : String(order?.id ?? "");
  return id.slice(0, 30);
}

async function sendDltSms({ f2sMessageId, variablesValues, phoneRaw }) {
  const apiKey = process.env.FAST2SMS_API_KEY?.trim();
  const entityId = process.env.FAST2SMS_ENTITY_ID?.trim();
  const senderId = process.env.FAST2SMS_SENDER_ID?.trim();
  const smsRoute = (process.env.FAST2SMS_SMS_ROUTE || "dlt").toLowerCase();

  if (!apiKey || !entityId || !senderId || !f2sMessageId) {
    return { ok: false, skipped: true, reason: "missing_fast2sms_config" };
  }

  if (smsRoute !== "dlt") {
    console.warn("orderStatusSms: FAST2SMS_SMS_ROUTE must be dlt for order templates (Message ID flow).");
    return { ok: false, skipped: true, reason: "route_not_dlt" };
  }

  const digits = normalizeIndianMobile(phoneRaw);
  if (digits.length !== 10) {
    return { ok: false, skipped: true, reason: "invalid_phone" };
  }

  const vars = String(variablesValues ?? "").trim().slice(0, 30);
  const payload = {
    route: "dlt",
    sender_id: senderId,
    message: String(f2sMessageId).trim(),
    variables_values: vars,
    numbers: formatNumbersForFast2SMS(digits),
    entity_id: entityId,
    flash: "0",
  };

  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!data.return) {
    console.error("orderStatusSms Fast2SMS error:", JSON.stringify(data));
  }
  return { ok: !!data.return, data };
}

function orderSmsDisabled() {
  return String(process.env.FAST2SMS_ORDER_STATUS_SMS_ENABLED || "").trim() === "0";
}

function plainOrder(order) {
  if (!order) return null;
  return order.get ? order.get({ plain: true }) : order;
}

/**
 * @param {object} order Sequelize instance or plain
 * @param {string|null|undefined} prevStatus
 * @param {string|null|undefined} nextStatus
 */
export async function notifyOrderStatusChange(order, prevStatus, nextStatus) {
  if (orderSmsDisabled()) return;

  const o = plainOrder(order);
  if (!o || !o.phone) return;

  const prev = String(prevStatus ?? "").trim().toLowerCase();
  const next = String(nextStatus ?? "").trim().toLowerCase();

  const toConfirmed = next === "confirmed" && prev !== "confirmed";
  const toDelivered = next === "delivered" && prev !== "delivered";

  if (!toConfirmed && !toDelivered) return;

  const variable = orderVariableForTemplate(o);

  if (toConfirmed) {
    const mid = process.env.FAST2SMS_ORDER_CONFIRMED_F2S_MESSAGE_ID?.trim();
    if (mid) {
      const r = await sendDltSms({ f2sMessageId: mid, variablesValues: variable, phoneRaw: o.phone });
      console.log("orderStatusSms confirmed:", o.order_id || o.id, r.ok ? "sent" : "failed", r.skipped ? r.reason : "");
    }
  }

  if (toDelivered) {
    const mid = process.env.FAST2SMS_ORDER_DELIVERED_F2S_MESSAGE_ID?.trim();
    if (mid) {
      const r = await sendDltSms({ f2sMessageId: mid, variablesValues: variable, phoneRaw: o.phone });
      console.log("orderStatusSms delivered:", o.order_id || o.id, r.ok ? "sent" : "failed", r.skipped ? r.reason : "");
    }
  }
}

export function notifyOrderStatusChangeAsync(order, prevStatus, nextStatus) {
  notifyOrderStatusChange(order, prevStatus, nextStatus).catch((e) => {
    console.error("orderStatusSms async error:", e);
  });
}
