import { Suspense } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { ReviewClient } from "./review-client";

export default function Page() {
  return (
    <Suspense fallback={<HydrationGate>{null}</HydrationGate>}>
      <ReviewClient />
    </Suspense>
  );
}
