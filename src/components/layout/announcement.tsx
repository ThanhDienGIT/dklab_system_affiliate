import Link from "next/link";

export function AnnouncementBar({ text, href }: { text: string; href: string }) {
  return (
    <div className="bg-ink text-ivory">
      <div className="container-x flex h-9 items-center justify-center text-center text-[11px] uppercase tracking-[0.22em]">
        {href ? <Link href={href} className="link-u truncate">{text}</Link> : <span className="truncate">{text}</span>}
      </div>
    </div>
  );
}
