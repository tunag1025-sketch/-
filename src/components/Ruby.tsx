import type { RubySegment } from "@/lib/types";

export function Ruby({ segs, hideReading = false }: { segs: RubySegment[]; hideReading?: boolean }) {
  return (
    <>
      {segs.map((seg, i) =>
        seg.r ? (
          <ruby key={i}>
            {seg.t}
            <rt className={hideReading ? "invisible" : undefined}>{seg.r}</rt>
          </ruby>
        ) : (
          <span key={i}>{seg.t}</span>
        ),
      )}
    </>
  );
}
