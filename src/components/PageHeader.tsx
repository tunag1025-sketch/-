import Link from "next/link";
import { Icon, type IconName } from "./Icon";

/** 탭 화면 제목 */
export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 pt-6">
      <div className="min-w-0">
        {sub && <p className="text-[15px] font-medium text-ink-3">{sub}</p>}
        <h1 className="text-[28px] leading-tight font-bold tracking-[-0.03em]">{title}</h1>
      </div>
      {right}
    </header>
  );
}

/** 하위 화면 위쪽 막대: 뒤로 + 가운데 제목 + 오른쪽 버튼들 */
export function TopBar({ backHref, title, right }: { backHref: string; title?: string; right?: React.ReactNode }) {
  return (
    <header className="grid h-16 grid-cols-[auto_1fr_auto] items-center gap-3">
      <CircleLink href={backHref} icon="back" label="뒤로" />
      <span className="truncate text-center text-[15px] font-semibold">{title}</span>
      <div className="flex items-center gap-2">{right}</div>
    </header>
  );
}

export function CircleLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  return (
    <Link href={href} aria-label={label} className="press grid size-11 place-items-center rounded-full bg-surface">
      <Icon name={icon} />
    </Link>
  );
}

export function CircleButton({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`press grid size-11 place-items-center rounded-full ${active ? "bg-blue text-on-blue" : "bg-surface"}`}
    >
      <Icon name={icon} className="size-[19px]" />
    </button>
  );
}
