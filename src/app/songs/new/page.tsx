import { Suspense } from "react";
import { HydrationGate } from "@/components/HydrationGate";
import { NewSongClient } from "./new-song-client";

export default function Page() {
  return (
    <Suspense fallback={<HydrationGate>{null}</HydrationGate>}>
      <NewSongClient />
    </Suspense>
  );
}
