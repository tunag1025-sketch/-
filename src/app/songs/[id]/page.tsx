import { Suspense } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { SongClient } from "./song-client";

export default function Page() {
  return (
    <Suspense fallback={<HydrationGate>{null}</HydrationGate>}>
      <SongClient />
    </Suspense>
  );
}
