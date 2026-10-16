import { Mascot, mascotFor } from "./Mascots";

const BG = {
  note: "linear-gradient(140deg, #dcebff, #b6d3ff)",
  pick: "linear-gradient(140deg, #fff4cc, #ffe08a)",
  bubble: "linear-gradient(140deg, #ebe4ff, #cfc2ff)",
  heart: "linear-gradient(140deg, #ffe3ee, #ffc2d8)",
} as const;

/** 노래 커버: 노래마다 정해진 캐릭터와 파스텔 배경 */
export function SongCover({ id, className = "size-[60px] rounded-[20px]" }: { id: string; className?: string }) {
  const kind = mascotFor(id);
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden ${className}`} style={{ background: BG[kind] }}>
      <Mascot kind={kind} happy className="w-[72%]" />
    </span>
  );
}
