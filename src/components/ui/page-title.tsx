import type { ReactNode } from "react";

export function PageTitle({ eyebrow, title, sub, children }: { eyebrow?: string; title: string; sub?: string; children?: ReactNode }) {
  return (
    <header className="container-x pt-10 text-center md:pt-14">
      {eyebrow && <p className="eyebrow animate-fade-up">{eyebrow}</p>}
      <h1 className="mt-3 text-4xl md:text-6xl animate-fade-up [animation-delay:.06s]">{title}</h1>
      {sub && <p className="mx-auto mt-4 max-w-2xl text-[15px] text-ink-soft animate-fade-up [animation-delay:.12s]">{sub}</p>}
      {children}
    </header>
  );
}
