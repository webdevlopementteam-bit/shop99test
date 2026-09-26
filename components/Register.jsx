"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { safeRedirectPath } from "@/lib/redirect";
import { verifyOtpApi, apiErrorMessage } from "@/lib/api";
import { toast } from "react-toastify";
import { upsertCustomer } from "@/lib/customerStore";
import { usePhoneOtp } from "@/lib/usePhoneOtp";

export default function Register() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    phone,
    setPhone,
    otp,
    inputsRef,
    timer,
    otpSentForPhone,
    sendingOtp,
    sendOtp,
    handleOtpChange,
    handleOtpKeyDown,
    normalizePhone,
  } = usePhoneOtp();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [snack, setSnack] = useState("");

  const showSnack = (msg) => {
    setSnack(msg);
    setTimeout(() => setSnack(""), 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.warning("Enter your name");
      return;
    }

    const digits = normalizePhone(phone);

    if (digits.length !== 10) {
      showSnack("Enter a valid 10-digit mobile number");
      return;
    }

    if (!otpSentForPhone || otpSentForPhone !== digits) {
      toast.warning("Send OTP to your number first");
      return;
    }

    const otpValue = otp.join("");

    if (otpValue.length !== 6) {
      toast.warning("Enter complete OTP");
      return;
    }

    try {
      setVerifying(true);

      const payload = {
        phone: digits,
        otp: otpValue,
        name: trimmedName,
      };

      const emailTrim = email.trim();

      if (emailTrim) {
        payload.email = emailTrim;
      }

      const data = await verifyOtpApi(payload);

      if (!data?.token) {
        toast.error("No token from server");
        return;
      }

      if (data.isNewUser) {
        toast.success("Account created ✅");
      } else {
        toast.success("This number was already registered — you’re signed in ✅");
      }

      localStorage.setItem("token", data.token);

      if (data.role != null) {
        localStorage.setItem("role", String(data.role));
      }

      localStorage.setItem(
        "user",
        JSON.stringify({
          name: data.user?.name || trimmedName,
        }),
      );

      upsertCustomer({
        username: data.user?.name || trimmedName,
        phone: digits,
        email: data.user?.email || emailTrim,
      });

      const next = safeRedirectPath(searchParams.get("redirect"));

      setTimeout(() => {
        window.location.assign(next);
      }, 600);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-gray-50
        px-4
        py-6
        sm:px-6
        lg:px-8
      "
    >
      <div
        className="
          w-full
          max-w-sm
          sm:max-w-md
          md:max-w-lg
          bg-white
          rounded-2xl
          sm:rounded-3xl
          shadow-2xl
          p-5
          sm:p-8
        "
      >
        {/* Heading */}
        <h2
          className="
            text-2xl
            sm:text-3xl
            font-bold
            text-primaryColor
            text-center
          "
        >
          Create Account
        </h2>

        {/* Sub Heading */}
        <p
          className="
            text-gray-500
            text-xs
            sm:text-sm
            text-center
            mt-2
            mb-6
          "
        >
          Register with OTP — no password
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <FloatingInput label="Full Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />

          {/* Email */}
          <FloatingInput label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />

          {/* Phone */}
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="
              w-full
              border-2
              border-gray-200
              rounded-xl
              px-4
              py-3
              text-sm
              sm:text-base
              focus:border-primaryColor
              outline-none
              transition
            "
            required
          />

          {/* OTP Actions */}
          <div className="flex flex-col gap-2">
            <div
              className="
                flex
                justify-between
                items-center
                text-xs
                sm:text-sm
                gap-2
              "
            >
              {timer > 0 ? (
                <span className="text-gray-500">Resend OTP in {timer}s</span>
              ) : (
                <span className="text-gray-500">Didn&apos;t get OTP?</span>
              )}

              <button
                type="button"
                onClick={() => sendOtp(showSnack)}
                disabled={timer > 0 || sendingOtp}
                className="
                  text-secondaryColor
                  font-semibold
                  whitespace-nowrap
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              >
                {sendingOtp ? "Sending…" : timer > 0 ? "Wait" : "Send OTP"}
              </button>
            </div>
          </div>

          {/* OTP Inputs */}
          <div
            className="
              flex
              justify-center
              gap-2
              sm:gap-3
              flex-wrap
            "
          >
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                value={digit}
                inputMode="numeric"
                maxLength={1}
                onChange={(e) => handleOtpChange(e.target.value, index)}
                onKeyDown={(e) => handleOtpKeyDown(e, index)}
                className="
                  w-10
                  h-11
                  sm:w-12
                  sm:h-14
                  md:w-14
                  md:h-14
                  text-center
                  text-base
                  sm:text-lg
                  font-bold
                  border-2
                  border-gray-300
                  rounded-lg
                  sm:rounded-xl
                  focus:border-secondaryColor
                  outline-none
                  transition
                "
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={verifying}
            className="
              w-full
              bg-primaryColor
              text-white
              py-3
              sm:py-3.5
              rounded-xl
              text-sm
              sm:text-base
              font-semibold
              hover:bg-[#0f2b5c]
              transition
              shadow-lg
              disabled:opacity-50
            "
          >
            {verifying ? "Creating…" : "Create account"}
          </button>
        </form>

        {/* Login */}
        <p
          className="
            text-center
            mt-6
            text-xs
            sm:text-sm
          "
        >
          Already have an account?{" "}
          <span
            onClick={() => {
              const qs = searchParams.toString();
              router.push(`/login${qs ? `?${qs}` : ""}`);
            }}
            className="
              text-secondaryColor
              font-semibold
              cursor-pointer
            "
          >
            Login
          </span>
        </p>
      </div>

      {/* Snackbar */}
      {snack && (
        <div
          className="
            fixed
            bottom-5
            left-1/2
            -translate-x-1/2
            bg-black
            text-white
            px-4
            sm:px-6
            py-3
            rounded-xl
            shadow-lg
            text-sm
            z-50
            whitespace-nowrap
          "
        >
          {snack}
        </div>
      )}
    </div>
  );
}

function FloatingInput({ label, value, onChange, type = "text", autoComplete, required = false }) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        placeholder=" "
        required={required}
        autoComplete={autoComplete}
        onChange={onChange}
        className="
          peer
          w-full
          border-2
          border-gray-200
          rounded-xl
          px-4
          pt-5
          pb-2
          text-sm
          sm:text-base
          outline-none
          focus:border-primaryColor
          transition
        "
      />

      <label
        className="
          absolute
          left-4
          top-2
          text-xs
          text-gray-500
          peer-placeholder-shown:top-3.5
          peer-placeholder-shown:text-sm
          peer-focus:top-2
          peer-focus:text-xs
          peer-focus:text-primaryColor
          transition-all
          pointer-events-none
        "
      >
        {label}
      </label>
    </div>
  );
}
