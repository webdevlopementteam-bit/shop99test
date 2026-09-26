// Same orderController.updateReturnReplacement used by both
// /api/orders/:id/return and /api/orders/:id/replacement in the original
// Express app (orderRoutes.js mounted the same handler on both paths).
export { PUT } from "@/app/api/orders/[id]/return/route.js";
