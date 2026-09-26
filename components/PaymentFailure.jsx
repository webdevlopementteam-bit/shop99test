"use client";

import { useEffect, useState } from "react";
import { Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { verifyPaymentApi } from "@/lib/api";

function getStatus(res) {
  return String(
    res?.status ?? res?.payment_status ?? res?.paymentStatus ?? res?.payment?.status ?? res?.data?.status ?? res?.data?.payment_status ?? "",
  ).toLowerCase();
}

function isExplicitFailureFromPayload(data) {
  if (!data || typeof data !== "object") return false;

  const status = String(data.status ?? "").toLowerCase();

  return status === "failure" || status === "failed" || status === "cancelled" || status === "canceled";
}

function isExplicitFailureFromVerify(res) {
  if (!res || typeof res !== "object") return false;

  const status = getStatus(res);

  return (
    status === "failure" ||
    status === "failed" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "declined" ||
    status === "aborted"
  );
}

function isExplicitSuccessFromVerify(res) {
  if (!res || typeof res !== "object") return false;

  if (res.verified === true || res.result === "success" || res.success === true || res?.data?.success === true) {
    return true;
  }

  const status = getStatus(res);

  return status === "success" || status === "captured" || status === "paid" || status === "completed";
}

function isPendingOrConfirmedFromVerify(res) {
  if (!res || typeof res !== "object") return false;

  const status = getStatus(res);
  const message = String(res.message ?? res?.data?.message ?? "").toLowerCase();

  return status === "pending" || status === "processing" || status === "confirmed" || message.includes("partial verify payload");
}

function getTransactionId(data) {
  const pendingTxnid = sessionStorage.getItem("payu_pending_txnid") || "";

  return data.txnid || data.txnId || data.txn_id || data.mihpayid || pendingTxnid || "";
}

const PaymentFailure = () => {
  const router = useRouter();

  const [transactionId, setTransactionId] = useState("");
  const [isRechecking, setIsRechecking] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const data = Object.fromEntries(params.entries());

        const txnid = getTransactionId(data);

        if (!txnid) {
          setIsRechecking(false);
          setChecked(true);
          return;
        }

        setTransactionId(txnid);

        const verifyPayload = {
          ...data,
          txnid,
          pending_txnid: sessionStorage.getItem("payu_pending_txnid") || "",
          amount: data.amount || sessionStorage.getItem("payu_pending_amount") || "",
          order_pk: sessionStorage.getItem("payu_pending_order_pk") || "",
        };

        const attempts = [0, 2000, 4000, 7000];

        for (let i = 0; i < attempts.length; i += 1) {
          if (attempts[i] > 0) {
            setIsRechecking(true);
            await new Promise((resolve) => setTimeout(resolve, attempts[i]));
          }

          const verifyRes = await verifyPaymentApi(verifyPayload);

          console.log("Payment failure verify response:", verifyRes);

          if (!isExplicitFailureFromPayload(data) && !isExplicitFailureFromVerify(verifyRes) && isExplicitSuccessFromVerify(verifyRes)) {
            router.replace(`/payment-success?txnid=${encodeURIComponent(txnid)}&verify=1&payment=success`);
            return;
          }

          if (
            !isExplicitFailureFromPayload(data) &&
            !isExplicitFailureFromVerify(verifyRes) &&
            isPendingOrConfirmedFromVerify(verifyRes)
          ) {
            router.replace(`/payment-success?txnid=${encodeURIComponent(txnid)}&verify=1&orderStatus=pending`);
            return;
          }

          if (isExplicitFailureFromVerify(verifyRes)) {
            break;
          }
        }
      } catch (error) {
        console.error("Payment verification failed", error);
      } finally {
        setIsRechecking(false);
        setChecked(true);
      }
    };

    verifyPayment();
  }, [router]);

  if (isRechecking && !checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-amber-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mb-4 flex justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
          </div>

          <h1 className="text-xl font-bold text-gray-800">Verifying payment...</h1>

          <p className="mt-2 text-sm text-gray-500">Please wait while we confirm your PayU transaction.</p>

          {transactionId && <p className="mt-4 break-all text-xs text-gray-500">Transaction ID: {transactionId}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-red-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl sm:p-10">
        <div className="mb-4 flex justify-center">
          <XCircle className="h-16 w-16 text-red-500 sm:h-20 sm:w-20" />
        </div>

        <h1 className="text-2xl font-bold text-gray-800">Payment Failed</h1>

        <p className="mt-2 text-gray-500">Unfortunately your payment could not be processed. Please try again.</p>

        {transactionId && (
          <div className="mt-6 rounded-lg bg-gray-100 p-3">
            <p className="text-sm text-gray-600">Transaction ID</p>
            <p className="break-all font-semibold text-gray-800">{transactionId}</p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push("/checkout")}
            className="flex-1 rounded-lg bg-red-500 py-3 text-white transition hover:bg-red-600"
          >
            Try Again
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex-1 rounded-lg border border-gray-300 py-3 transition hover:bg-gray-100"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;
