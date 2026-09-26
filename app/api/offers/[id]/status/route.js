import Offer from "@/lib/models/offerModel.js";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const offer = await Offer.findByPk(id);

  if (!offer) {
    return Response.json({ message: "Offer not found" }, { status: 404 });
  }

  offer.is_active = !offer.is_active;
  await offer.save();

  return Response.json({ message: "Status updated", data: offer });
}
