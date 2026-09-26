"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { sendOtpApi, apiErrorMessage } from "@/lib/api";
import { toast } from "react-toastify";

export function normalizePhone(p) {
  return String(p || "")
    .replace(/\D/g, "")
    .slice(-10);
}

/**
 * Shared phone + 6-digit OTP UI for login / register (send-otp → verify-otp).
 */
export function usePhoneOtp() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputsRef = useRef([]);
  const [timer, setTimer] = useState(0);
  const [otpSentForPhone, setOtpSentForPhone] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);

  const handleOtpChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = useCallback(
    (e, index) => {
      if (e.key === "Backspace" && !otp[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    },
    [otp],
  );

  const sendOtp = async (showSnack) => {
    const digits = normalizePhone(phone);
    if (digits.length !== 10) {
      showSnack?.("Enter a valid 10-digit mobile number");
      return;
    }

    try {
      setSendingOtp(true);
      await sendOtpApi({ phone: digits });
      setPhone(digits);
      setOtpSentForPhone(digits);
      toast.success("OTP sent successfully ✅");
      setTimer(30);
    } catch (err) {
      console.error(err);
      toast.error(apiErrorMessage(err));
    } finally {
      setSendingOtp(false);
    }
  };

  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    const d = normalizePhone(phone);
    if (otpSentForPhone && d !== otpSentForPhone) {
      setOtpSentForPhone("");
      setOtp(["", "", "", "", "", ""]);
    }
  }, [phone, otpSentForPhone]);

  return {
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
  };
}
