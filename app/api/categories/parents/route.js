import { Op } from "sequelize";
import Category from "@/lib/models/categoryModel.js";

export async function GET(request) {
  try {
    const excludeId = request.nextUrl.searchParams.get("excludeId");

    const whereCondition = {};
    if (excludeId) {
      whereCondition.id = { [Op.ne]: excludeId };
    }

    const data = await Category.findAll({
      where: whereCondition,
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });

    return Response.json(data);
  } catch (err) {
    return Response.json(err.message, { status: 500 });
  }
}
