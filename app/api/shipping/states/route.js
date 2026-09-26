import { INDIAN_STATES } from "@/lib/constants/indianStates.js";

export async function GET() {
  return Response.json({ states: INDIAN_STATES });
}
