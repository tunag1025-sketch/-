import { Suspense } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { SignupClient } from "./signup-client";

export default function Page() {
  return (
    <Suspense fallback={<HydrationGate>{null}</HydrationGate>}>
      <SignupClient />
    </Suspense>
  );
}
