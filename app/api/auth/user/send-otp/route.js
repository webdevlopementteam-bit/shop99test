// Same otpController.sendOTP used by both /api/otp/send-otp and /api/auth/user/send-otp
// in the original Express app (authRoutes.js mounted otpController directly).
export { POST } from "@/app/api/otp/send-otp/route.js";
