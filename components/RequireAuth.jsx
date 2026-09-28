"use client";

import Link from "next/link";
import { getUserToken } from "@/lib/authSession";

/**
 * Only renders children when JWT exists. Used for checkout.
 */
export default function RequireAuth({ children }) {
  const token = getUserToken();
  if (token) return children;

  const redirect = encodeURIComponent("/checkout");

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center w-full">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Sign in to checkout</h2>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          Please log in to continue to checkout. If you don&apos;t have an account yet, register with your mobile number first.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/login?redirect=${redirect}`}
            className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold text-center hover:bg-orange-600 transition"
          >
            Log in
          </Link>
          <Link
            href={`/register?redirect=${redirect}`}
            className="border-2 border-orange-500 text-orange-600 px-6 py-3 rounded-lg font-semibold text-center hover:bg-orange-50 transition"
          >
            Register
          </Link>
        </div>
        <Link href="/cart" className="inline-block mt-6 text-sm text-gray-500 hover:text-gray-700">
          ← Back to cart
        </Link>
      </div>
    </div>
  );
}
