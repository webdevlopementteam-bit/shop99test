import About from "@/lib/models/aboutModel.js";

export async function GET() {
  try {
    const list = await About.findAll({ order: [["id", "DESC"]] });
    return Response.json(list);
  } catch (error) {
    console.error("GET ABOUT LIST ERROR:", error);
    return Response.json({ message: "Server Error" }, { status: 500 });
  }
}
