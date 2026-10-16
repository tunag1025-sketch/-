import { Suspense } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { LoginClient } from "./login-client";

export default function Page() {
  return (
    <Suspense fallback={<HydrationGate>{null}</HydrationGate>}>
      <LoginClient />
    </Suspense>
  );
}
