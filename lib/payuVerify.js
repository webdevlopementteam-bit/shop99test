// Verifies that a POST to our PayU surl/furl really came from PayU.
//
// PayU signs its response with a "reverse hash" built from our merchant salt,
// which only PayU and we know:
//   sha512([additional_charges|]SALT|status||||||udf5|udf4|udf3|udf2|udf1|
//          email|firstname|productinfo|amount|txnid|key)
// Without this check anyone could POST txnid + status=success to the surl and
// get an unpaid order confirmed.

import crypto from "crypto";
import payu from "@/lib/payuConfig.js";

const s = (v) => (v == null ? "" : String(v));

export function payuReverseHash(body, salt = payu.salt, key = payu.key) {
  const parts = [
    salt,
    s(body.status),
    "", "", "", "", "", // udf10..udf6
    s(body.udf5), s(body.udf4), s(body.udf3), s(body.udf2), s(body.udf1),
    s(body.email),
    s(body.firstname),
    s(body.productinfo),
    s(body.amount),
    s(body.txnid),
    key,
  ];
  if (s(body.additionalCharges || body.additional_charges)) {
    parts.unshift(s(body.additionalCharges || body.additional_charges));
  }
  return crypto.createHash("sha512").update(parts.join("|")).digest("hex");
}

/** True only if `body` carries a valid PayU hash for our merchant key/salt. */
export function isGenuinePayuResponse(body, salt = payu.salt, key = payu.key) {
  if (!salt || !key || !body) return false;
  if (s(body.key) && s(body.key) !== key) return false;
  const received = s(body.hash).trim().toLowerCase();
  if (!/^[0-9a-f]{128}$/.test(received)) return false;
  const expected = payuReverseHash(body, salt, key);
  return crypto.timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}

/** PayU's amount matches what the order was created for (to the paisa). */
export function amountMatchesOrder(body, order) {
  const paid = Number(body?.amount);
  const due = Number(order?.total_amount);
  if (!Number.isFinite(paid) || !Number.isFinite(due)) return false;
  return Math.abs(paid - due) < 0.01;
}
