import Link from "next/link";
import { Icon, type IconName } from "./Icon";

/** 두 줄 제목: 첫 줄은 진하게, 둘째 줄은 그라데이션 */
export function Headline({
  first,
  second,
  className = "text-[30px]",
  as: Tag = "h1",
}: {
  first: React.ReactNode;
  second: React.ReactNode;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <Tag className={`leading-[1.18] font-extrabold tracking-[-0.035em] ${className}`}>
      <span className="block">{first}</span>
      <span className="grad-text block pb-0.5">{second}</span>
    </Tag>
  );
}

/** 하위 화면 위쪽 막대: 뒤로 + 가운데 제목 + 오른쪽 버튼들 */
export function TopBar({ backHref, title, right }: { backHref: string; title?: string; right?: React.ReactNode }) {
  return (
    <header className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div>
        <CircleLink href={backHref} icon="back" label="뒤로" />
      </div>
      <span className="truncate text-center text-[16px] font-semibold">{title}</span>
      <div className="flex items-center justify-end gap-2">{right}</div>
    </header>
  );
}

const CIRCLE = "press grid size-11 place-items-center rounded-full border border-line bg-surface text-ink-2";

export function CircleLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link href={href} aria-label={label} className={CIRCLE}>
      <Icon name={icon} className="size-[19px]" />
    </Link>
  );
}

export function CircleButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={CIRCLE}>
      <Icon name={icon} className="size-[19px]" />
    </button>
  );
}
