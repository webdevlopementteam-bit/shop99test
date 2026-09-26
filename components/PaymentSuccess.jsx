"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Clock, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyPaymentApi } from "@/lib/api";

const PAYU_TXN_KEY = "payu_pending_txnid";
const PAYU_AMT_KEY = "payu_pending_amount";
const PAYU_ORDER_PK_KEY = "payu_pending_order_pk";

function pickTxnId(obj) {
  if (!obj || typeof obj !== "object") return "";
  const keys = ["txnid", "mihpayid", "transaction_id", "transactionId", "txnId", "id"];
  for (const key of keys) {
    const val = obj[key];
    if (val != null && String(val).trim() !== "") return String(val).trim();
  }
  return "";
}

function getVerifyStatus(res) {
  return String(
    res?.status ?? res?.payment_status ?? res?.paymentStatus ?? res?.payment?.status ?? res?.data?.status ?? res?.data?.payment_status ?? "",
  )
    .trim()
    .toLowerCase();
}

function payuParamsLookFailed(p) {
  if (!p || typeof p !== "object") return false;
  const status = String(p.status ?? "").trim().toLowerCase();
  if (status === "success" || status === "captured") return false;

  if (status === "failure" || status === "failed" || status === "cancelled" || status === "canceled") {
    return true;
  }

  const unmapped = String(p.unmappedstatus ?? p.unmapped_status ?? "").toLowerCase();

  if (unmapped === "user cancelled" || unmapped.includes("user_cancelled") || unmapped === "failed" || unmapped === "failure") {
    return true;
  }

  return false;
}

function verifyResponseLooksPending(res) {
  if (res == null || typeof res !== "object") return false;

  const status = getVerifyStatus(res);
  const msg = String(res.message ?? res?.data?.message ?? "").toLowerCase();

  return status === "pending" || status === "processing" || status === "confirmed" || msg.includes("partial verify payload");
}

function verifyResponseLooksFailed(res) {
  if (res == null || typeof res !== "object") return false;

  const msg = String(res.message ?? res?.data?.message ?? "").toLowerCase();
  const st = getVerifyStatus(res);

  if (msg.includes("partial verify payload") && (st === "pending" || st === "confirmed" || st === "processing")) {
    return false;
  }

  if (res.success === true || res?.data?.success === true) return false;
  if (st === "success" || st === "captured" || st === "paid" || st === "completed") {
    return false;
  }
  if (res.result === "success" || res.verified === true) return false;

  if (st === "failure" || st === "failed" || st === "cancelled" || st === "canceled" || st === "declined" || st === "aborted") {
    return true;
  }

  if (res.success === false && !verifyResponseLooksPending(res)) return true;
  if (res.verified === false && !verifyResponseLooksPending(res)) return true;

  const pay = res.payment;
  if (pay && typeof pay === "object" && String(pay.status ?? "").toLowerCase() === "failure") {
    return true;
  }

  return false;
}

function verifyResponseLooksSuccessful(res) {
  if (res == null || typeof res !== "object") return false;

  const status = getVerifyStatus(res);

  if (status === "success" || status === "captured" || status === "paid" || status === "completed") {
    return true;
  }

  if (res.result === "success" || res.verified === true || res.success === true || res?.data?.success === true) {
    return true;
  }

  return false;
}

const PaymentSuccess = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isCod = searchParams.get("cod") === "1";
  const codOrderId = searchParams.get("order_id") || "";
  const verifyMode = searchParams.get("verify") === "1";
  const urlOrderStatus = String(searchParams.get("orderStatus") || "")
    .trim()
    .toLowerCase();

  const [phase, setPhase] = useState(() => (isCod ? "ok" : "checking"));
  const [confirmationPending, setConfirmationPending] = useState(() => {
    return (
      verifyMode &&
      (urlOrderStatus === "pending" || urlOrderStatus === "processing" || urlOrderStatus === "confirmed" || !urlOrderStatus)
    );
  });

  const [transactionId, setTransactionId] = useState(() => {
    if (typeof window === "undefined") return "";

    try {
      const sp = new URLSearchParams(window.location.search);

      if (sp.get("cod") === "1") {
        return sp.get("order_id") || sp.get("txnid") || "";
      }

      const q = Object.fromEntries(sp.entries());
      const fromUrl = pickTxnId(q);

      if (fromUrl) return fromUrl;

      return sessionStorage.getItem(PAYU_TXN_KEY) || "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    if (isCod) {
      setTransactionId(codOrderId || searchParams.get("txnid") || "");
      localStorage.removeItem("buyNow");
      setConfirmationPending(false);
      setPhase("ok");
      return;
    }

    const verifyPayment = async () => {
      let merged = {};

      try {
        const fromSearch = Object.fromEntries(new URLSearchParams(window.location.search).entries());

        let fromHash = {};
        const h = window.location.hash || "";

        if (h.includes("?")) {
          const q = h.split("?")[1];
          if (q) {
            fromHash = Object.fromEntries(new URLSearchParams(q).entries());
          }
        }

        let storedTxn = "";
        let storedAmt = "";

        try {
          storedTxn = sessionStorage.getItem(PAYU_TXN_KEY) || "";
          storedAmt = sessionStorage.getItem(PAYU_AMT_KEY) || "";
        } catch (_) {
          /* ignore */
        }

        merged = { ...fromHash, ...fromSearch };

        if (!merged.txnid && storedTxn) merged.txnid = storedTxn;
        if (!merged.amount && storedAmt) merged.amount = storedAmt;

        const txnFromMerged = pickTxnId(merged);

        if (txnFromMerged) {
          setTransactionId(txnFromMerged);
        }

        if (payuParamsLookFailed(merged) && !verifyMode) {
          const q = new URLSearchParams();

          Object.entries(merged).forEach(([k, v]) => {
            if (v != null && String(v) !== "") q.set(k, String(v));
          });

          router.replace(`/payment-failure${q.toString() ? `?${q.toString()}` : ""}`);
          return;
        }

        const res = await verifyPaymentApi(merged);

        console.log("Payment success verify response:", res);

        const txnFromVerify = pickTxnId(res) || pickTxnId(res?.data) || pickTxnId(res?.payment);

        if (txnFromVerify) {
          setTransactionId(txnFromVerify);
        }

        if (verifyResponseLooksSuccessful(res)) {
          setConfirmationPending(false);
          localStorage.removeItem("buyNow");
          setPhase("ok");
          return;
        }

        if (verifyResponseLooksPending(res) || verifyMode) {
          setConfirmationPending(true);
          localStorage.removeItem("buyNow");
          setPhase("ok");
          return;
        }

        if (verifyResponseLooksFailed(res)) {
          const q = new URLSearchParams();

          Object.entries(merged).forEach(([k, v]) => {
            if (v != null && String(v) !== "") q.set(k, String(v));
          });

          router.replace(`/payment-failure${q.toString() ? `?${q.toString()}` : ""}`);
          return;
        }

        // Unknown backend response: if PayU sent us here or failure page recovered,
        // show received instead of false failed.
        if (txnFromMerged || verifyMode) {
          setConfirmationPending(true);
          localStorage.removeItem("buyNow");
          setPhase("ok");
          return;
        }

        const q = new URLSearchParams();

        Object.entries(merged).forEach(([k, v]) => {
          if (v != null && String(v) !== "") q.set(k, String(v));
        });

        router.replace(`/payment-failure${q.toString() ? `?${q.toString()}` : ""}`);
      } catch (error) {
        console.error("Verification error:", error);

        const httpStatus = Number(error?.response?.status || 0);
        const txn = pickTxnId(merged) || (typeof window !== "undefined" ? sessionStorage.getItem(PAYU_TXN_KEY) : "") || "";

        if (txn) setTransactionId(txn);

        if (httpStatus === 401 || txn || verifyMode) {
          setConfirmationPending(true);
          localStorage.removeItem("buyNow");
          setPhase("ok");
          return;
        }

        const q = new URLSearchParams(window.location.search);
        router.replace(`/payment-failure?${q.toString()}`);
      } finally {
        try {
          sessionStorage.removeItem(PAYU_TXN_KEY);
          sessionStorage.removeItem(PAYU_AMT_KEY);
          sessionStorage.removeItem(PAYU_ORDER_PK_KEY);
        } catch (_) {
          /* ignore */
        }
      }
    };

    verifyPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCod, codOrderId, router, searchParams, verifyMode]);

  useEffect(() => {
    if (phase !== "ok") return;

    const t = window.setTimeout(() => {
      router.replace("/account?tab=orders");
    }, 2200);

    return () => window.clearTimeout(t);
  }, [phase, router]);

  if (!isCod && phase === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-green-50 px-4">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-xl sm:p-10">
          <Loader2 className="h-12 w-12 animate-spin text-green-600" />

          <p className="text-lg font-medium text-gray-700">Verifying payment...</p>

          <p className="max-w-xs text-center text-sm text-gray-500">Please wait while we confirm your transaction.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-green-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl sm:p-10">
        <div className="mb-4 flex justify-center">
          {confirmationPending ? (
            <Clock className="h-16 w-16 text-amber-500 sm:h-20 sm:w-20" />
          ) : (
            <CheckCircle className="h-16 w-16 text-green-500 sm:h-20 sm:w-20" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-800">
          {isCod ? "Order placed" : confirmationPending ? "Payment Received" : "Payment Successful"}
        </h1>

        <p className="mt-2 text-gray-500">
          {isCod
            ? "Thank you! You chose Cash on Delivery. Pay when your order arrives."
            : confirmationPending
              ? "Your payment was successful. Your order confirmation is pending and will update shortly."
              : "Thank you! Your payment has been processed successfully."}
        </p>

        {confirmationPending && !isCod && (
          <div className="mt-4 inline-flex rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
            Pending Confirmation
          </div>
        )}

        <div className="mt-6 rounded-lg bg-gray-100 p-3">
          <p className="text-sm text-gray-600">{isCod ? "Order reference" : "Transaction ID"}</p>

          <p className="break-all font-semibold text-gray-800">{transactionId || codOrderId || "Not available yet"}</p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/account?tab=orders")}
          className="mt-6 w-full rounded-lg bg-green-500 py-3 font-medium text-white transition duration-300 hover:bg-green-600"
        >
          View my orders
        </button>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-3 w-full rounded-lg border border-gray-300 bg-white py-3 font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Go to home
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
