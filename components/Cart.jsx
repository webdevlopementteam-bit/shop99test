"use client";

import { useCart } from "@/context/CartContext";
import Link from "next/link";

export default function Cart() {
  const { cart, updateQty, removeFromCart } = useCart();

  const subtotal = cart.reduce((total, item) => total + Number(item.price) * Number(item.qty), 0);

  const total = subtotal;

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ================= LEFT ================= */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-6">Shopping Cart</h2>

          {cart.length === 0 && <p className="text-gray-400">Your cart is empty</p>}

          {cart.map((item) => {
            const rowKey = item.cartLineId ?? item.id;
            return (
              <div key={rowKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b py-4">
                {/* LEFT SIDE */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <img src={item.image} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded object-contain" />

                  <div>
                    <p className="font-medium text-sm sm:text-base">{item.name}</p>
                    {item.variantLabel ? (
                      <p className="text-xs text-gray-500 mt-0.5">
                        <span className="font-medium text-gray-600">Variants: </span>
                        {item.variantLabel}
                      </p>
                    ) : null}
                    <p className="text-red-500 font-semibold text-sm sm:text-base">₹{item.price}</p>
                  </div>
                </div>

                {/* RIGHT SIDE CONTROLS */}
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                  {/* QTY */}
                  <div className="flex items-center gap-2 border rounded-lg">
                    <button onClick={() => updateQty(rowKey, "dec")} className="px-3 py-1 text-sm">
                      -
                    </button>

                    <span className="px-3 text-sm">{item.qty}</span>

                    <button onClick={() => updateQty(rowKey, "inc")} className="px-3 py-1 text-sm">
                      +
                    </button>
                  </div>

                  {/* REMOVE */}
                  <button onClick={() => removeFromCart(rowKey)} className="text-red-500 text-sm">
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ================= RIGHT ================= */}
        <div className="bg-white rounded-xl shadow p-4 sm:p-6 h-fit">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Order Summary</h2>

          <Row label="Subtotal" value={`₹${subtotal.toFixed(2)}`} />

          <div className="border-t my-3" />

          <Row label="Total" value={`₹${total.toFixed(2)}`} bold />

          <Link
            href="/checkout"
            className="block text-center w-full mt-5 bg-orange-500 text-white py-3 rounded-lg font-semibold text-sm sm:text-base"
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between text-sm mb-2 ${bold ? "font-bold text-base sm:text-lg" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
