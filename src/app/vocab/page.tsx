import { Suspense } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { VocabClient } from "./vocab-client";

export default function Page() {
  return (
    <Suspense fallback={<HydrationGate>{null}</HydrationGate>}>
      <VocabClient />
    </Suspense>
  );
}
