"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/context/CartContext";
import {
  createPaymentApi,
  BASE_URL,
  getProductShippingApi,
  getShippingStatesApi,
  getCategoriesApi,
  getUserAddressesApi,
} from "@/lib/api";
import { useRouter } from "next/navigation";
import { INDIAN_STATES } from "@/lib/constants/indianStates";
import { consumeNavState } from "@/lib/navState";
import { SITE_URL } from "@/lib/siteConfig";

function safeParseBuyNow() {
  try {
    const raw = localStorage.getItem("buyNow");
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p && typeof p === "object" ? p : null;
  } catch {
    return null;
  }
}

function cartItemLabel(p) {
  const label = p?.name || p?.title || p?.product_name;
  if (label) return String(label).trim();
  if (p?.id != null) return `Product #${p.id}`;
  return "";
}

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const router = useRouter();
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  // const [availableCoupons, setAvailableCoupons] = useState([]);

  const [billing, setBilling] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postcode: "",
  });

  const [isGstBilling, setIsGstBilling] = useState(false);
  const [gstFirmName, setGstFirmName] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  const [shippingByProduct, setShippingByProduct] = useState({});
  const [shippingStates, setShippingStates] = useState(INDIAN_STATES);
  const [categoryGstMap, setCategoryGstMap] = useState({});
  const [paymentMode, setPaymentMode] = useState("payu");
  const [codConfirmOpen, setCodConfirmOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const orderInFlightRef = useRef(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addingNewAddress, setAddingNewAddress] = useState(true);
  const [saveAddressForNextTime, setSaveAddressForNextTime] = useState(true);

  const setBillingField = (field) => (e) =>
    setBilling((prev) => ({ ...prev, [field]: e.target.value }));

  const mapAddressToBilling = (address) => {
    if (!address) return;
    const fullName = String(address.full_name || "").trim();
    const [first = "", ...rest] = fullName.split(/\s+/);
    setBilling((prev) => ({
      ...prev,
      firstName: first || prev.firstName,
      lastName: rest.join(" ") || prev.lastName,
      phone: String(address.phone || "").trim(),
      address: String(address.address_line || "").trim(),
      city: String(address.city || "").trim(),
      state: String(address.state || "").trim(),
      postcode: String(address.postcode || "").trim(),
    }));
  };

  /**
   * PayU surl/furl must match the site user actually uses .
   * Deriving only from API host breaks when frontend is on www / different domain than `api.` strip.
   */
  const FRONT_URL =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin.replace(/\/$/, "")
      : SITE_URL;

  const [navState] = useState(() => consumeNavState("checkout"));
  const navigatedBuyNow = navState?.type === "buyNow";
  const parsedBuyNow = safeParseBuyNow();

  const buyNowProduct = navigatedBuyNow
    ? navState?.product || parsedBuyNow
    : cart.length > 0
      ? null
      : parsedBuyNow;

  useEffect(() => {
    if (!navigatedBuyNow && cart.length > 0 && localStorage.getItem("buyNow")) {
      localStorage.removeItem("buyNow");
    }
  }, [navigatedBuyNow, cart.length]);

  const checkoutLineItems = buyNowProduct ? [buyNowProduct] : cart;

  useEffect(() => {
    const loadStates = async () => {
      try {
        const res = await getShippingStatesApi();
        const states = Array.isArray(res?.states) ? res.states : [];
        if (states.length > 0) setShippingStates(states);
      } catch {
        setShippingStates(INDIAN_STATES);
      }
    };
    loadStates();
  }, []);

  useEffect(() => {
    const loadCategoryGst = async () => {
      try {
        const data = await getCategoriesApi();
        const rows = Array.isArray(data) ? data : data?.categories || [];
        const map = {};
        rows.forEach((c) => {
          map[Number(c.id)] = Number(c.tax_rate ?? c.gst_percentage ?? 0);
        });
        setCategoryGstMap(map);
      } catch (e) {
        console.error("Category GST fetch failed:", e);
        setCategoryGstMap({});
      }
    };
    loadCategoryGst();
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadAddresses = async () => {
      setLoadingAddresses(true);
      try {
        const data = await getUserAddressesApi();
        const rows = Array.isArray(data?.addresses) ? data.addresses : [];
        if (ignore) return;
        setSavedAddresses(rows);

        if (rows.length) {
          const defaultAddress =
            rows.find((row) => Boolean(row.is_default)) || rows[0];
          if (defaultAddress) {
            setSelectedAddressId(String(defaultAddress.id));
            setAddingNewAddress(false);
            setSaveAddressForNextTime(false);
            mapAddressToBilling(defaultAddress);
          }
        } else {
          setSelectedAddressId(null);
          setAddingNewAddress(true);
          setSaveAddressForNextTime(true);
        }
      } catch (error) {
        if (ignore) return;
        setSavedAddresses([]);
        setSelectedAddressId(null);
        setAddingNewAddress(true);
        setSaveAddressForNextTime(true);
        console.log(error, "err")
      } finally {
        if (!ignore) setLoadingAddresses(false);
      }
    };

    loadAddresses();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (addingNewAddress) {
      setSelectedAddressId(null);
      setSaveAddressForNextTime(true);
      return;
    }
    setSaveAddressForNextTime(false);
  }, [addingNewAddress]);

  useEffect(() => {
    if (addingNewAddress || !selectedAddressId) return;
    const selected = savedAddresses.find(
      (row) => String(row.id) === String(selectedAddressId),
    );
    if (selected) mapAddressToBilling(selected);
  }, [selectedAddressId, savedAddresses, addingNewAddress]);

  useEffect(() => {
    const ids = [
      ...new Set(
        checkoutLineItems
          .map((item) => Number(item.product_id || item.id || item.product?.id))
          .filter((id) => Number.isFinite(id))
      ),
    ];

    if (!ids.length) {
      setShippingByProduct({});
      return;
    }

    let ignore = false;

    const loadShipping = async () => {
      const rows = await Promise.all(
        ids.map(async (id) => {
          try {
            const data = await getProductShippingApi(id);
            return [id, data];
          } catch {
            return [id, null];
          }
        })
      );
      if (ignore) return;
      setShippingByProduct(Object.fromEntries(rows));
    };

    loadShipping();

    return () => {
      ignore = true;
    };
  }, [checkoutLineItems]);

  /* ================= CALCULATIONS ================= */

  const subtotal = React.useMemo(() => {
    if (buyNowProduct) {
      const unit = Number(buyNowProduct.price ?? buyNowProduct.sale_price ?? 0);
      const q = Number(buyNowProduct.qty || 1);
      return unit * q;
    }
    return cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
  }, [buyNowProduct, cart]);

  const shippingTotal = React.useMemo(() => {
    const selectedState = billing.state?.trim();

    return checkoutLineItems.reduce((sum, item) => {
      const productId = Number(item.product_id || item.id || item.product?.id);
      const qty = Number(item.qty || 1);
      const shipping = shippingByProduct[productId];

      if (!shipping || shipping.shipping_mode === "free") return sum;

      if (shipping.shipping_mode === "flat") {
        return sum + (Number(shipping.shipping_flat_fee) || 0) * qty;
      }

      if (shipping.shipping_mode === "by_state") {
        const rates =
          shipping.shipping_state_rates &&
          typeof shipping.shipping_state_rates === "object"
            ? shipping.shipping_state_rates
            : {};
        const rate = selectedState ? Number(rates[selectedState]) || 0 : 0;
        return sum + rate * qty;
      }

      return sum;
    }, 0);
  }, [checkoutLineItems, shippingByProduct, billing.state]);

  const discountTotal = couponDiscount;

  const total = React.useMemo(() => {
    return Math.max(subtotal - discountTotal + shippingTotal, 0);
  }, [subtotal, discountTotal, shippingTotal]);

  // Per-item GST summary from category GST map (checkout load par hi visible)
  const taxSummary = React.useMemo(() => {
    return checkoutLineItems.reduce(
      (acc, item) => {
        const qty = Number(item.qty || 1);
        const unitInclusive = Number(item.price ?? item.sale_price ?? 0);
        const lineInclusive = unitInclusive * qty;

        const categoryId = Number(
          item.category_id || item.category?.id || item.product?.category_id
        );

        const gstRate = Number(
          item.tax_rate ??
            item.category?.tax_rate ??
            item.product?.category?.tax_rate ??
            categoryGstMap[categoryId] ??
            0
        );

        if (!Number.isFinite(lineInclusive) || lineInclusive <= 0) return acc;

        if (!Number.isFinite(gstRate) || gstRate <= 0) {
          acc.taxable += lineInclusive;
          return acc;
        }

        const taxable = lineInclusive / (1 + gstRate / 100);
        const gst = lineInclusive - taxable;

        acc.taxable += taxable;
        acc.cgst += gst / 2;
        acc.sgst += gst / 2;

        return acc;
      },
      { taxable: 0, cgst: 0, sgst: 0 }
    );
  }, [checkoutLineItems, categoryGstMap]);

  // Discounts are assumed on item value (not shipping), so proportional tax reduction
  const { taxableAfterDiscount, cgstAfterDiscount, sgstAfterDiscount } =
    React.useMemo(() => {
      const safeSubtotal = Math.max(Number(subtotal) || 0, 0);
      const safeDiscount = Math.max(Number(discountTotal) || 0, 0);
      const discountOnItems = Math.min(safeDiscount, safeSubtotal);
      const ratio =
        safeSubtotal > 0 ? (safeSubtotal - discountOnItems) / safeSubtotal : 0;
      return {
        taxableAfterDiscount: Math.max((taxSummary.taxable || 0) * ratio, 0),
        cgstAfterDiscount: Math.max((taxSummary.cgst || 0) * ratio, 0),
        sgstAfterDiscount: Math.max((taxSummary.sgst || 0) * ratio, 0),
      };
    }, [subtotal, discountTotal, taxSummary]);

  /* ================= COUPON / OFFER ================= */

  // useEffect(() => {
  //   fetch(`${BASE_URL}/api/coupons`)
  //     .then((res) => res.json())
  //     .then((data) => setAvailableCoupons(data.data || data))
  //     .catch((err) => console.error(err));
  // }, []);

  // const selectCoupon = async (code) => {
  //   setCouponCode(code);
  //   try {
  //     await navigator.clipboard.writeText(code);
  //   } catch {
  //     console.error("Failed to copy coupon code to clipboard");
  //   }
  //   applyCoupon(code);
  // };

  // const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  //   .toISOString()
  //   .split("T")[0];

  // const validCoupons = availableCoupons.filter((coupon) => {
  //   const begin = coupon.begin_on
  //     ? new Date(coupon.begin_on).toISOString().split("T")[0]
  //     : null;
  //   const end = coupon.end_on
  //     ? new Date(coupon.end_on).toISOString().split("T")[0]
  //     : null;

  //   return (
  //     coupon.is_active && (!begin || begin <= today) && (!end || end >= today)
  //   );
  // });
  const applyCoupon = async (codeParam) => {
  const codeToUse =
    typeof codeParam === "string" ? codeParam.trim() : couponCode.trim();

  if (!codeToUse) {
    alert("Enter coupon code");
    return;
  }

  const res = await fetch(`${BASE_URL}/api/coupons/apply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: codeToUse,
      price: subtotal,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.message || "Invalid coupon");
    return;
  }

  setCouponCode(codeToUse);
  setCouponDiscount(Number(data.discount || 0));
  setCouponApplied(true);
};

  // const applyCoupon = async (codeParam) => {
  //   const codeToUse = codeParam || couponCode;

  //   if (!codeToUse) {
  //     alert("Enter coupon code");
  //     return;
  //   }

  //   const res = await fetch(`${BASE_URL}/api/coupons/apply`, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       code: codeToUse,
  //       price: subtotal,
  //     }),
  //   });

  //   const data = await res.json();

  //   if (!res.ok) {
  //     alert(data.message || "Invalid coupon");
  //     return;
  //   }

  //   setCouponDiscount(Number(data.discount || 0));
  //   setCouponApplied(true);
  // };

  /* ================= PAYMENT ================= */

  let finalProductName = "";
  let finalAmount = 0;
  let finalQty = 0;
  let finalProductId = null;
  let finalAttributes = "";
  let finalUnitPrice = 0;
  let finalMrp = 0;
  let finalVariantId = null;
  let finalVariantSku = "";
  let finalVariantLabel = "";

  if (buyNowProduct) {
    finalProductName = buyNowProduct.name;
    finalAmount = total;
    finalQty = buyNowProduct.qty || 1;
    finalProductId = buyNowProduct.product_id || buyNowProduct.id || null;
    finalAttributes = String(
      buyNowProduct.variantAttributes ?? buyNowProduct.variantLabel ?? "",
    ).trim();
    finalUnitPrice = Number(
      buyNowProduct.price ?? buyNowProduct.sale_price ?? 0,
    );
    finalMrp = Number(
      buyNowProduct.old_price ?? buyNowProduct.mrp ?? 0,
    );
    finalVariantId = buyNowProduct.variant_id ?? null;
    finalVariantSku = String(buyNowProduct.variant_sku ?? "").trim();
    finalVariantLabel = String(buyNowProduct.variantLabel ?? "").trim();
  } else if (cart.length > 0) {
    const firstLine = cart[0] || {};
    const names = cart.map(cartItemLabel).filter(Boolean);
    finalProductName =
      names.length > 0 ? names.join(", ") : `Order — ${cart.length} item(s)`;
    finalAmount = total;
    finalQty = cart.reduce((sum, p) => sum + Number(p.qty), 0);
    finalProductId =
      firstLine.product_id || firstLine.id || firstLine.product?.id || null;
    finalAttributes = cart
      .map((item) =>
        String(item?.variantAttributes ?? item?.variantLabel ?? "").trim(),
      )
      .filter(Boolean)
      .join(" | ");
    finalUnitPrice = Number(firstLine.price ?? firstLine.sale_price ?? 0);
    finalMrp = Number(firstLine.old_price ?? firstLine.mrp ?? 0);
    finalVariantId = firstLine.variant_id ?? null;
    finalVariantSku = String(firstLine.variant_sku ?? "").trim();
    finalVariantLabel = String(firstLine.variantLabel ?? "").trim();
  }

  /** Only fields marked * in the form — optional: email, last name */
  const getMissingMandatoryBilling = () => {
    if (!addingNewAddress && selectedAddressId) return [];
    const missing = [];
    if (!billing.firstName?.trim()) missing.push("First name");
    if (!billing.phone?.trim()) missing.push("Phone number");
    if (!billing.address?.trim()) missing.push("Address");
    if (!billing.city?.trim()) missing.push("Town / City");
    if (!billing.state?.trim()) missing.push("State / UT");
    if (!billing.postcode?.trim()) missing.push("Postcode / ZIP");
    if (isGstBilling) {
      if (!gstFirmName.trim()) missing.push("Firm name");
      if (!gstNumber.trim()) missing.push("GST number");
    }
    return missing;
  };

  /** PayU / server often require non-empty email & lastname — safe placeholders if user skipped optional fields */
  const normalizePaymentIdentity = () => {
    const first = billing.firstName.trim();
    const lastRaw = billing.lastName.trim();
    const phoneDigits = String(billing.phone || "").replace(/\D/g, "");
    const emailNorm =
      billing.email.trim() ||
      (phoneDigits.length >= 6
        ? `${phoneDigits}@customer.invalid`
        : "customer@example.com");
    const lastNorm = lastRaw || first || "Customer";
    const fullName = [first, lastRaw].filter(Boolean).join(" ").trim() || first;
    return { first, lastRaw, lastNorm, emailNorm, fullName, phoneDigits };
  };

  const placeOrder = async () => {
    if (orderInFlightRef.current) return;

    const missing = getMissingMandatoryBilling();
    if (missing.length) {
      alert(`Please fill: ${missing.join(", ")}`);
      return;
    }

    orderInFlightRef.current = true;

    const { first, lastNorm, emailNorm, fullName } = normalizePaymentIdentity();

    setPlacingOrder(true);
    try {
      const lineItemsPayload = checkoutLineItems.map((line) => ({
        product_id: Number(line.product_id ?? line.id ?? 0) || null,
        variant_id: line.variant_id ?? null,
        variant_sku: line.variant_sku ?? null,
        variant_label: String(
          line.variantLabel ?? line.variant_label ?? "",
        ).trim(),
        qty: Number(line.qty || 1),
        selling_price: Number(line.price ?? line.sale_price ?? 0),
        mrp: Number(line.old_price ?? line.mrp ?? 0),
      }));

      const paymentData = {
        amount: finalAmount,
        firstname: first || fullName,
        lastname: lastNorm,
        email: emailNorm,
        phone: billing.phone.trim(),
        customer_name: fullName || first,
        address: billing.address.trim(),
        city: billing.city.trim(),
        state: billing.state.trim(),
        postcode: billing.postcode.trim(),
        gst_billing: isGstBilling ? 1 : 0,
        firm_name: isGstBilling ? gstFirmName.trim() : "",
        gst_number: isGstBilling ? gstNumber.trim().toUpperCase() : "",
        productinfo: finalProductName,
        product_id: finalProductId,
        qty: finalQty,
        attributes: finalAttributes,
        rate: Number.isFinite(finalUnitPrice) ? finalUnitPrice : 0,
        unit_price: Number.isFinite(finalUnitPrice) ? finalUnitPrice : 0,
        selling_price: Number.isFinite(finalUnitPrice) ? finalUnitPrice : 0,
        mrp: Number.isFinite(finalMrp) ? finalMrp : 0,
        variant_mrp: Number.isFinite(finalMrp) ? finalMrp : 0,
        variant_id: finalVariantId || undefined,
        variant_sku: finalVariantSku || undefined,
        variant_label: finalVariantLabel || undefined,
        line_items: JSON.stringify(lineItemsPayload),
        payment_mode: paymentMode === "cod" ? "COD" : "payu",
        address_id:
          !addingNewAddress && selectedAddressId ? Number(selectedAddressId) : undefined,
        save_address: addingNewAddress && saveAddressForNextTime ? 1 : 0,
        address_label: addingNewAddress ? "Home" : undefined,
      };

      const res = await createPaymentApi(paymentData);

      if (!res?.success) {
        alert(res?.message || "Order could not be placed");
        return;
      }

      if (res.cod === true) {
        localStorage.removeItem("buyNow");
        if (!buyNowProduct && cart.length > 0) {
          clearCart();
        }
        const oid = encodeURIComponent(res.order_id || "");
        const txn = encodeURIComponent(res.txnid || "");
        router.push(`/payment-success?cod=1&order_id=${oid}&txnid=${txn}`);
        return;
      }

      if (!res.action) {
        alert("Payment gateway URL missing. Please try again.");
        return;
      }

      const form = document.createElement("form");
      form.method = "POST";
      form.action = res.action;

      Object.keys(res).forEach((key) => {
      if (
        key === "action" ||
        key === "tax" ||
        key === "success" ||
        key === "cod" ||
        key === "surl" ||
        key === "furl"
      ) {
        return;
      }
      if (res[key] == null || typeof res[key] === "object") return;
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = String(res[key]);
      form.appendChild(input);
    });
      // Object.keys(res).forEach((key) => {
      //   if (key === "action" || key === "tax") return;
      //   if (typeof res[key] === "object") return;

      //   const input = document.createElement("input");
      //   input.type = "hidden";
      //   input.name = key;
      //   input.value = res[key];
      //   form.appendChild(input);
      // });

      const surl = document.createElement("input");
      surl.type = "hidden";
      surl.name = "surl";
      // surl.value = `${FRONT_URL}/payment-success`;
      // Absolute URL on the site the user is on — PayU resolves a relative
      // one against its own domain (txncdn.payubiz.in/api/orders/payu/success).
      surl.value = `${FRONT_URL}/api/orders/payu/success`;
      form.appendChild(surl);

      const furl = document.createElement("input");
      furl.type = "hidden";
      furl.name = "furl";
      // furl.value = `${FRONT_URL}/payment-failure`;
      furl.value = `${FRONT_URL}/api/orders/payu/failure`;
      form.appendChild(furl);

      /* PayU success URL par txnid kabhi-kabhi POST body mein aata hai, URL mein nahi — success page par dikhane / verify ke liye */
      try {
        sessionStorage.setItem("payu_pending_txnid", String(res.txnid ?? ""));
        sessionStorage.setItem("payu_pending_amount", String(res.amount ?? ""));
        const orderPk =
          res.id ?? res.order_db_id ?? res.order_pk ?? res.orderId ?? null;
        if (orderPk != null && String(orderPk).trim() !== "") {
          sessionStorage.setItem("payu_pending_order_pk", String(orderPk));
        }
      } catch (_) {
        /* ignore */
      }

      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error(error);
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Payment failed",
      );
    } finally {
      orderInFlightRef.current = false;
      setPlacingOrder(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!checkoutLineItems.length) {
      alert("No product found ❌");
      return;
    }

    if (paymentMode === "cod") {
      setCodConfirmOpen(true);
      return;
    }

    await placeOrder();
  };

  useEffect(() => {
    if (!codConfirmOpen) return;
    const onKey = (ev) => {
      if (ev.key === "Escape" && !placingOrder) setCodConfirmOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [codConfirmOpen, placingOrder]);

  /* ================= UI ================= */
  return (
    <div className="bg-gray-100 min-h-screen py-10 px-4">
      {codConfirmOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
            role="presentation"
          >
            <button
              type="button"
              className="absolute inset-0 bg-gray-900/55 backdrop-blur-[2px]"
              aria-label="Close dialog"
              disabled={placingOrder}
              onClick={() => !placingOrder && setCodConfirmOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cod-confirm-title"
              className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-1 ring-gray-200/80"
            >
              <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4">
                <h2
                  id="cod-confirm-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  Confirm Cash on Delivery
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Are you sure you want to place this order? You will pay when the
                  order is delivered.
                </p>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
                  <span className="font-medium text-gray-700">Order total</span>
                  <span className="text-lg font-bold text-orange-600">
                    ₹{total.toFixed(2)}
                  </span>
                </div>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={placingOrder}
                    onClick={() => setCodConfirmOpen(false)}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 sm:w-auto sm:min-w-[120px]"
                  >
                    No, cancel
                  </button>
                  <button
                    type="button"
                    disabled={placingOrder}
                    onClick={async () => {
                      setCodConfirmOpen(false);
                      await placeOrder();
                    }}
                    className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-orange-600 disabled:opacity-60 sm:w-auto sm:min-w-[160px]"
                  >
                    {placingOrder ? "Placing order…" : "Yes, confirm order"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {cart.length === 0 && !buyNowProduct ? (
        <div className="text-center text-gray-500 text-lg">Your cart is empty 🛒</div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-8"
        >
          {/* BILLING */}
          <div className="lg:col-span-2 bg-white p-8 rounded-xl shadow">
            <h2 className="text-2xl font-semibold mb-6">Billing Details</h2>

            <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">Saved addresses</p>
                  <button
                    type="button"
                    onClick={() => setAddingNewAddress(true)}
                    className="text-sm font-medium text-orange-600 hover:text-orange-700"
                  >
                    + Add another address
                  </button>
                </div>

                {loadingAddresses ? (
                  <p className="text-sm text-gray-500">Loading addresses...</p>
                ) : savedAddresses.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No saved address yet. Add one below and save for next checkout.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {savedAddresses.map((addr) => {
                      const isSelected =
                        !addingNewAddress && String(selectedAddressId) === String(addr.id);
                      return (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => {
                            setSelectedAddressId(String(addr.id));
                            setAddingNewAddress(false);
                          }}
                          className={`w-full rounded-lg border p-3 text-left transition ${
                            isSelected
                              ? "border-orange-500 bg-orange-50"
                              : "border-gray-200 bg-white hover:border-orange-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-gray-800">
                              {addr.label || "Address"}
                            </p>
                            {addr.is_default ? (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                Default
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-gray-700">{addr.full_name}</p>
                          <p className="text-sm text-gray-600">{addr.phone}</p>
                          <p className="mt-1 text-sm text-gray-600">
                            {addr.address_line}, {addr.city}, {addr.state} - {addr.postcode}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
            </div>

{!addingNewAddress && selectedAddressId ? (
  <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
    <p className="text-sm font-medium text-green-800">
      Selected saved address will be used as delivery address.
    </p>

    <p className="mt-1 text-sm text-green-700">
      Address details are already saved, so you do not need to fill them again.
    </p>

    <button
      type="button"
      onClick={() => setAddingNewAddress(true)}
      className="mt-2 text-sm font-medium text-orange-600 hover:text-orange-700"
    >
      Use a new address
    </button>
  </div>
) : (
  <div className="grid md:grid-cols-2 gap-4">
    <FormInput
      label="First Name"
      required
      value={billing.firstName}
      onChange={setBillingField("firstName")}
      autoComplete="given-name"
    />

    <FormInput
      label="Last Name"
      value={billing.lastName}
      onChange={setBillingField("lastName")}
      autoComplete="family-name"
    />

    <FormInput
      label="Email Address"
      type="email"
      value={billing.email}
      onChange={setBillingField("email")}
      autoComplete="email"
    />

    <FormInput
      label="Phone Number"
      type="tel"
      required
      value={billing.phone}
      onChange={setBillingField("phone")}
      autoComplete="tel"
    />

    <FormInput
      label="Address"
      className="col-span-2"
      required
      value={billing.address}
      onChange={setBillingField("address")}
      autoComplete="street-address"
    />

    <FormInput
      label="Town / City"
      required
      value={billing.city}
      onChange={setBillingField("city")}
      autoComplete="address-level2"
    />

    <div>
      <Label text="State / UT" required />
      <select
        required
        value={billing.state}
        onChange={setBillingField("state")}
        className="w-full rounded-lg border p-3"
      >
        <option value="">Select state / UT</option>
        {shippingStates.map((stateName) => (
          <option key={stateName} value={stateName}>
            {stateName}
          </option>
        ))}
      </select>
    </div>

    <FormInput
      label="Postcode / ZIP"
      required
      value={billing.postcode}
      onChange={setBillingField("postcode")}
      autoComplete="postal-code"
    />

    <div className="col-span-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={saveAddressForNextTime}
          onChange={(e) => setSaveAddressForNextTime(e.target.checked)}
        />
        <span className="text-sm font-medium">
          Save this address for next checkout
        </span>
      </label>
    </div>
  </div>
)}

          <div className="mt-4 grid md:grid-cols-2 gap-4">
  <div className="col-span-2 mt-2">
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={isGstBilling}
        onChange={(e) => setIsGstBilling(e.target.checked)}
      />
      <span className="text-sm font-medium">GST Billing</span>
    </label>
  </div>

  {isGstBilling && (
    <>
      <FormInput
        label="Firm Name"
        required
        value={gstFirmName}
        onChange={(e) => setGstFirmName(e.target.value)}
      />
      <FormInput
        label="GST Number"
        required
        value={gstNumber}
        onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
      />
    </>
  )}
</div>
          </div>

          {/* ORDER SUMMARY */}
          <div className="bg-white p-6 rounded-xl shadow h-fit">
            <h2 className="text-xl font-semibold mb-6">Order Summary</h2>

            {buyNowProduct ? (
              <div className="flex justify-between items-center border-b py-4">
                <div className="flex items-center gap-3">
                  <img src={buyNowProduct.image} alt="" className="w-14 h-14 rounded object-contain" />
                  <div className="text-sm">
                    <p>{buyNowProduct.name} × {buyNowProduct.qty || 1}</p>
                    {buyNowProduct.variantLabel ? (
                      <p className="mt-0.5 text-xs text-gray-500">
                        <span className="font-medium text-gray-600">Variants: </span>
                        {buyNowProduct.variantLabel}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="text-red-500 font-semibold">
                  ₹{(Number(buyNowProduct.price ?? buyNowProduct.sale_price ?? 0) * Number(buyNowProduct.qty || 1)).toFixed(2)}
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.cartLineId ?? item.id}
                  className="flex justify-between items-center border-b py-4"
                >
                  <div className="flex items-center gap-3">
                    <img src={item.image} alt="" className="w-14 h-14 rounded object-contain" />
                    <div className="text-sm">
                      <p>{item.name} × {item.qty}</p>
                      {item.variantLabel ? (
                        <p className="mt-0.5 text-xs text-gray-500">
                          <span className="font-medium text-gray-600">Variants: </span>
                          {item.variantLabel}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-red-500 font-semibold">₹{(item.price * item.qty).toFixed(2)}</p>
                </div>
              ))
            )}

            {/* {availableCoupons.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">Available Coupons</h3>
                <div className="flex flex-wrap gap-2">
                  {validCoupons
                    .filter((coupon) => {
                      if (coupon.apply_on === "all") return true;
                      if (coupon.apply_on === "product") {
                        return checkoutLineItems.some((item) =>
                          [item.id, item.product_id, item.product?.id]
                            .filter(Boolean)
                            .map(Number)
                            .includes(Number(coupon.product_id))
                        );
                      }
                      if (coupon.apply_on === "category") {
                        return checkoutLineItems.some((item) =>
                          [item.category_id, item.category?.id]
                            .filter(Boolean)
                            .map(Number)
                            .includes(Number(coupon.category_id))
                        );
                      }
                      return false;
                    })
                    .map((coupon) => (
                      <button
                        key={coupon.id}
                        type="button"
                        onClick={() => selectCoupon(coupon.code)}
                        className="border border-orange-500 text-orange-500 px-3 py-1 rounded text-xs"
                      >
                        {coupon.code}
                      </button>
                    ))}
                </div>
              </div>
            )} */}

            <div className="flex gap-2 mt-4">
              <input
                placeholder="Enter Coupon Code"
                className="border p-2 rounded w-full"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              {/* <button type="button" onClick={applyCoupon} className="bg-gray-800 text-white px-4 rounded">
                Apply
              </button> */}
              <button
                  type="button"
                  onClick={() => applyCoupon()}
                  className="bg-gray-800 text-white px-4 rounded"
                >
                  Apply
                </button>
            </div>

            {couponApplied && <p className="text-green-600 text-sm mt-2">Coupon Applied ✔</p>}

            <div className="space-y-2 mt-6 text-sm">
              {/* <Row label="Subtotal" value={`₹${subtotal.toFixed(2)}`} /> */}

              {couponDiscount > 0 && <Row label="Coupon Discount" value={`- ₹${couponDiscount.toFixed(2)}`} />}

              <Row
                label="Shipping"
                value={
                  shippingTotal > 0
                    ? `₹${shippingTotal.toFixed(2)}`
                    : billing.state
                      ? "Free"
                      : "Select state"
                }
              />

              {/* <Row label="Taxable Amount" value={`₹${taxableAfterDiscount.toFixed(2)}`} />
              <Row label="CGST" value={`₹${cgstAfterDiscount.toFixed(2)}`} />
              <Row label="SGST" value={`₹${sgstAfterDiscount.toFixed(2)}`} /> */}

              <div className="flex justify-between font-bold text-lg border-t pt-3">
                <span>Total</span>
                <span className="text-red-500">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-sm font-semibold text-gray-800">Payment method</p>
              {/* <label className="flex cursor-pointer items-center gap-3 text-sm text-blue-700">
                <input
                  type="radio"
                  name="paymentMode"
                  className="h-4 w-4 shrink-0 accent-blue-600"
                  checked={paymentMode === "cod"}
                  onChange={() => setPaymentMode("cod")}
                />
                <span>Cash on Delivery</span>
              </label> */}
              <label className="flex cursor-pointer items-center gap-3 text-sm text-blue-700">
                <input
                  type="radio"
                  name="paymentMode"
                  className="h-4 w-4 shrink-0 accent-blue-600"
                  checked={paymentMode === "payu"}
                  onChange={() => setPaymentMode("payu")}
                />
                <span>Card / UPI / Paypal</span>
              </label>
              <p className="text-xs text-gray-500">
                {paymentMode === "cod"
                  ? "Pay when your order is delivered."
                  : "You will be redirected to PayU to complete payment securely."}
              </p>
            </div>

            <button
              type="submit"
              disabled={placingOrder}
              className="w-full bg-orange-500 text-white py-3 mt-6 rounded-lg font-semibold shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {placingOrder
                ? "Placing order…"
                : paymentMode === "cod"
                  ? "Place order (COD)"
                  : "Pay with PayU"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ================= COMPONENTS ================= */

function Label({ text, required }) {
  return (
    <label className="block mb-1 text-sm font-medium">
      {text}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

function FormInput({
  label,
  required,
  type = "text",
  className = "",
  value,
  onChange,
  autoComplete,
  disabled = false,
}) {
  return (
    <div className={className}>
      <Label text={label} required={required} />
      <input
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        disabled={disabled}
        className="w-full rounded-lg border p-3 disabled:cursor-not-allowed disabled:bg-gray-100"
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
