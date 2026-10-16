import Link from "next/link";
import { Icon, type IconName } from "./Icon";

/** 화면 제목: [ 영문 라벨 ] + 큰 한글 제목. backHref를 주면 뒤로 버튼이 붙는다. */
export function PageHeader({
  label,
  title,
  backHref,
  right,
}: {
  label: string;
  title: string;
  backHref?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-3 pt-5 pb-1">
      <div className="flex items-end gap-3">
        {backHref && <BackButton href={backHref} />}
        <div>
          <p className="font-mono text-[11px] font-bold tracking-wider text-pink-text">[ {label} ]</p>
          <h1 className="font-display text-[28px] leading-tight">{title}</h1>
        </div>
      </div>
      {right}
    </header>
  );
}

export function BackButton({ href, label = "뒤로", icon = "back" }: { href: string; label?: string; icon?: IconName }) {
  return (
    <Link
      href={href}
      className="sticker-sm press grid size-10 shrink-0 place-items-center rounded-full bg-surface"
      aria-label={label}
    >
      <Icon name={icon} />
    </Link>
  );
}
