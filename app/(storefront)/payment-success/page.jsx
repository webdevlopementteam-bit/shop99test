import { Suspense } from "react";
import PaymentSuccess from "@/components/PaymentSuccess";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PaymentSuccess />
    </Suspense>
  );
}
