// Same otpController.verifyOTP used by both /api/otp/verify-otp and /api/auth/user/verify-otp
// in the original Express app (authRoutes.js mounted otpController directly).
export { POST } from "@/app/api/otp/verify-otp/route.js";
