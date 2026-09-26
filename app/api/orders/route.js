import Order from "@/lib/models/orderModel.js";

export async function GET() {
  try {
    const data = await Order.findAll({ order: [["id", "DESC"]] });

    const normalized = data.map((row) => {
      const plain = row.get ? row.get({ plain: true }) : row;
      return { ...plain, delivery_date: "3-7 days", status: plain.status };
    });

    return Response.json(normalized);
  } catch (err) {
    console.error(err);
    return Response.json({ message: "Failed to fetch orders" }, { status: 500 });
  }
}
