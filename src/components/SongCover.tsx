"use client";

import { useId, useState } from "react";
import type { Song } from "@/lib/types";

// 사진이 없을 때 쓰는 랜덤 아트의 색 묶음 (바탕 + 번지는 동그라미 셋)
const PALETTES = [
  ["#dfe9ff", "#6f9dff", "#b7a4ff", "#ffc2dc"],
  ["#ffeadf", "#ff9db4", "#ffd27f", "#c4b2ff"],
  ["#dcf5ee", "#6fd3bd", "#93bfff", "#f3eda6"],
  ["#efe7ff", "#9c82ff", "#ff9ccd", "#86cdff"],
  ["#fff3d1", "#ffb169", "#ff7d9c", "#ffe08a"],
  ["#e2f1ff", "#4f8fff", "#7fe0f5", "#c5b7ff"],
] as const;

/** 노래 id로 정해지는 난수: 같은 노래는 늘 같은 그림이 나온다. */
function seeded(id: string) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function CoverArt({ id }: { id: string }) {
  const uid = useId().replace(/:/g, "");
  const rand = seeded(id);
  const [base, ...colors] = PALETTES[Math.floor(rand() * PALETTES.length)];
  const blobs = colors.map((fill) => ({
    fill,
    cx: 10 + rand() * 80,
    cy: 10 + rand() * 80,
    r: 26 + rand() * 22,
  }));
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="size-full" aria-hidden>
      <defs>
        <filter id={`b${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <rect width="100" height="100" fill={base} />
      <g filter={`url(#b${uid})`}>
        {blobs.map((b, i) => (
          <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={b.fill} />
        ))}
      </g>
    </svg>
  );
}

/** 노래 커버: 앨범 커버나 직접 고른 사진, 없으면 노래마다 정해진 랜덤 그라데이션 */
export function SongCover({
  song,
  className = "size-[60px] rounded-[20px]",
}: {
  song: Pick<Song, "id" | "cover">;
  className?: string;
}) {
  // 앨범 커버 주소를 못 불러오면(오프라인 등) 랜덤 그림으로 대신한다.
  const [failed, setFailed] = useState<string | null>(null);
  const cover = song.cover && song.cover !== failed ? song.cover : undefined;
  return (
    <span className={`block shrink-0 overflow-hidden ${className}`}>
      {cover ? (
        // 기기에 저장한 사진(data URL)이나 앨범 커버 주소라 next/image 최적화를 쓰지 않는다.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" onError={() => setFailed(cover)} className="size-full object-cover" />
      ) : (
        <CoverArt id={song.id} />
      )}
    </span>
  );
}
