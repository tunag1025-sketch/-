import { Mascot, mascotFor } from "./Mascots";

const BG = {
  blob: "linear-gradient(140deg, #e3f0ff, #c8ddff)",
  star: "linear-gradient(140deg, #fff7d9, #ffe9a8)",
  ball: "linear-gradient(140deg, #ffe8f3, #ffd0e6)",
  heart: "linear-gradient(140deg, #ffe9e6, #ffcfca)",
} as const;

/** 노래 커버: 노래마다 정해진 캐릭터와 파스텔 배경 */
export function SongCover({ id, className = "size-[60px] rounded-[20px]" }: { id: string; className?: string }) {
  const kind = mascotFor(id);
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden ${className}`} style={{ background: BG[kind] }}>
      <Mascot kind={kind} className="w-[86%]" />
    </span>
  );
}
