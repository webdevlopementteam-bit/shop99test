import Checkout from "@/components/Checkout";
import RequireAuth from "@/components/RequireAuth";

export default function Page() {
  return (
    <RequireAuth>
      <Checkout />
    </RequireAuth>
  );
}
