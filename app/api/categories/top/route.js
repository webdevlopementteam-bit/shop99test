import { listTopCategories } from "@/lib/storefrontLists.js";

export async function GET() {
  try {
    return Response.json(await listTopCategories());
  } catch (err) {
    return Response.json(err.message, { status: 500 });
  }
}
