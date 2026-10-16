import { Suspense } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { InviteClient } from "./invite-client";

export default function Page() {
  return (
    <Suspense fallback={<HydrationGate>{null}</HydrationGate>}>
      <InviteClient />
    </Suspense>
  );
}
